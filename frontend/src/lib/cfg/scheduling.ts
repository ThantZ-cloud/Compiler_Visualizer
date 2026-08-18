/**
 * Instruction scheduling (list scheduling for a simple pipeline).
 * From "Engineering a Compiler" Ch 7 — Instruction Selection & Scheduling.
 */

import type { TacInstruction } from '../../types';

export interface DependencyEdge {
  from: number; // TAC line
  to: number;
  type: 'data' | 'anti' | 'output';
  label: string;
}

export interface ScheduleEntry {
  tacLine: number;
  cycle: number;
  unit: string;
  dependencies: number[];
}

/** Per-cycle snapshot of the scheduler's internal state */
export interface CycleInfo {
  cycle: number;
  /** Instructions ready to issue at the start of this cycle */
  ready: number[];
  /** Instructions actually issued this cycle */
  issued: number[];
  /** Instructions ready but held back (issue-width limit) */
  stalled: number[];
}

/** Nodes/edges that form the longest latency-weighted dependency chain */
export interface CriticalPathInfo {
  /** TAC lines of instructions on the critical path */
  criticalNodes: Set<number>;
  /** Data-edge keys ("from->to") along the critical path */
  criticalEdges: Set<string>;
  /** Total latency of the longest chain (ops on the chain) */
  criticalLength: number;
}

export interface SchedulingResult {
  dependencies: DependencyEdge[];
  schedule: ScheduleEntry[];
  /** Critical path length (total cycles) */
  criticalPath: number;
  /** Original order cycles vs scheduled cycles */
  originalCycles: number;
  scheduledCycles: number;
  /** Cycles for a single-issue (serial) baseline */
  serialCycles: number;
  /** Per-cycle scheduler state (ready / issued / stalled) */
  cycleBreakdown: CycleInfo[];
  /** Longest latency-weighted dependency chain (Ch 7) */
  criticalPathInfo: CriticalPathInfo;
}

/** Estimate latency for an instruction type */
function getLatency(op: string): number {
  if (op === 'mult' || op === 'div' || op === 'mod') return 3;
  if (op === 'call') return 4;
  if (op === 'load' || op === 'array_load') return 2;
  if (op === 'store' || op === 'array_store') return 2;
  return 1; // add, sub, assign, compare, goto, etc.
}

/** Get the functional unit name for an instruction */
function getUnit(op: string): string {
  if (['mult', 'div', 'mod'].includes(op)) return 'MULT';
  if (['add', 'sub', 'neg'].includes(op)) return 'ALU';
  if (['eq', 'neq', 'lt', 'gt', 'le', 'ge'].includes(op)) return 'CMP';
  if (['load', 'array_load'].includes(op)) return 'MEM';
  if (['store', 'array_store'].includes(op)) return 'MEM';
  if (op === 'call') return 'CTRL';
  return 'ALU';
}

/** Extract variable names read/written by an instruction */
function getReadsWrites(instr: TacInstruction): { reads: string[]; writes: string[] } {
  const reads: string[] = [];
  const writes: string[] = [];

  if (instr.result) writes.push(instr.result);
  if (instr.arg1 && !instr.arg1.match(/^\d+$/)) reads.push(instr.arg1);
  if (instr.arg2 && !instr.arg2.match(/^\d+$/)) reads.push(instr.arg2);
  // phi functions read from all args
  if (instr.op === 'phi') {
    const phiArgs = (instr as TacInstruction & { phiArgs?: { varName?: unknown }[] }).phiArgs || [];
    for (const arg of phiArgs) {
      if (typeof arg.varName === 'string') reads.push(arg.varName);
    }
  }

  return { reads, writes };
}

/**
 * Build dependency graph between TAC instructions.
 * Three types: RAW (data), WAR (anti), WAW (output).
 */
function buildDependencyGraph(instructions: TacInstruction[]): DependencyEdge[] {
  const deps: DependencyEdge[] = [];

  for (let i = 0; i < instructions.length; i++) {
    const writer = instructions[i];
    if (writer.op === 'label' || writer.op === 'method_start' || writer.op === 'method_end') continue;

    const w = getReadsWrites(writer);

    for (let j = i + 1; j < instructions.length; j++) {
      const reader = instructions[j];
      if (reader.op === 'label' || reader.op === 'method_start' || reader.op === 'method_end') continue;

      const r = getReadsWrites(reader);

      // RAW (true dependency): writer produces, reader consumes
      for (const wVar of w.writes) {
        if (r.reads.includes(wVar)) {
          deps.push({
            from: writer.line,
            to: reader.line,
            type: 'data',
            label: `${wVar}: RAW`,
          });
          break;
        }
      }

      // WAR (anti-dependency): reader reads before writer overwrites
      for (const rVar of r.reads) {
        if (w.writes.includes(rVar)) {
          deps.push({
            from: writer.line,
            to: reader.line,
            type: 'anti',
            label: `${rVar}: WAR`,
          });
          break;
        }
      }

      // WAW (output dependency): both write same variable
      for (const wVar of w.writes) {
        if (r.writes.includes(wVar)) {
          deps.push({
            from: writer.line,
            to: reader.line,
            type: 'output',
            label: `${wVar}: WAW`,
          });
          break;
        }
      }
    }
  }

  return deps;
}

/**
 * List scheduling algorithm.
 * Schedules instructions into time slots, respecting dependencies.
 */
function listSchedule(
  instructions: TacInstruction[],
  dependencies: DependencyEdge[],
  numUnits: number = 2,
  cycleLog?: CycleInfo[],
): ScheduleEntry[] {
  const instrMap = new Map<number, TacInstruction>();
  for (const instr of instructions) {
    if (instr.op !== 'label' && instr.op !== 'method_start' && instr.op !== 'method_end') {
      instrMap.set(instr.line, instr);
    }
  }

  const instrLines = [...instrMap.keys()].sort((a, b) => a - b);

  // Build adjacency: for each instruction, what must come before it
  const predCount = new Map<number, number>();
  const succs = new Map<number, number[]>();
  const latencies = new Map<number, number>();

  for (const line of instrLines) {
    predCount.set(line, 0);
    succs.set(line, []);
    latencies.set(line, getLatency(instrMap.get(line)!.op));
  }

  for (const dep of dependencies) {
    if (instrMap.has(dep.from) && instrMap.has(dep.to)) {
      predCount.set(dep.to, (predCount.get(dep.to) || 0) + 1);
      succs.get(dep.from)?.push(dep.to);
    }
  }

  // Scheduling table
  const ready: number[] = [];
  const scheduled = new Map<number, ScheduleEntry>();
  const finishTime = new Map<number, number>();

  // Initialize: instructions with no predecessors
  for (const line of instrLines) {
    if (predCount.get(line) === 0) {
      ready.push(line);
    }
  }

  let cycle = 0;
  const maxCycles = 100;

  while (ready.length > 0 && cycle < maxCycles) {
    // Sort ready list by latency (longest first — critical path heuristic)
    ready.sort((a, b) => (latencies.get(b) || 1) - (latencies.get(a) || 1));
    const readySnapshot = [...ready];

    // Issue up to numUnits instructions per cycle
    const issued: number[] = [];
    const stillReady: number[] = [];

    for (const line of ready) {
      if (issued.length < numUnits) {
        const instr = instrMap.get(line)!;
        scheduled.set(line, {
          tacLine: line,
          cycle,
          unit: getUnit(instr.op),
          dependencies: dependencies
            .filter(d => d.to === line && scheduled.has(d.from))
            .map(d => d.from),
        });
        finishTime.set(line, cycle + (latencies.get(line) || 1));
        issued.push(line);
      } else {
        stillReady.push(line);
      }
    }

    if (cycleLog) {
      cycleLog.push({
        cycle,
        ready: readySnapshot,
        issued: [...issued],
        stalled: [...stillReady],
      });
    }

    ready.length = 0;

    // Update successors
    for (const line of issued) {
      for (const succ of succs.get(line) || []) {
        const newCount = (predCount.get(succ) || 1) - 1;
        predCount.set(succ, newCount);
        if (newCount === 0) {
          // Check if all predecessors are scheduled and their finish time is known
          let allPredsDone = true;
          for (const dep of dependencies) {
            if (dep.to === succ && !finishTime.has(dep.from)) {
              allPredsDone = false;
              break;
            }
          }
          if (allPredsDone || stillReady.length === 0) {
            ready.push(succ);
          }
        }
      }
    }

    // Add remaining ready instructions
    ready.push(...stillReady);

    // If no instructions were issued and ready is empty but not all scheduled, advance
    if (issued.length === 0 && ready.length === 0) {
      // Find earliest available instruction
      let earliest = Infinity;
      for (const line of instrLines) {
        if (!scheduled.has(line)) {
          const ft = finishTime.get(line);
          if (ft !== undefined && ft < earliest) earliest = ft;
        }
      }
      if (earliest < Infinity) {
        cycle = earliest;
        for (const line of instrLines) {
          if (!scheduled.has(line) && predCount.get(line) === 0) {
            ready.push(line);
          }
        }
      } else {
        break;
      }
    }

    cycle++;
  }

  // Schedule any remaining unscheduled instructions
  for (const line of instrLines) {
    if (!scheduled.has(line)) {
      const instr = instrMap.get(line)!;
      scheduled.set(line, {
        tacLine: line,
        cycle,
        unit: getUnit(instr.op),
        dependencies: [],
      });
      cycle++;
    }
  }

  return [...scheduled.values()].sort((a, b) => a.cycle - b.cycle || a.tacLine - b.tacLine);
}

/**
 * Compute the critical path: the longest latency-weighted chain of
 * data (RAW) dependencies. Data edges form a DAG, so longest-path
 * distances are well-defined.
 */
export function computeCriticalPath(
  instructions: TacInstruction[],
  dependencies: DependencyEdge[],
): CriticalPathInfo {
  const latOf = new Map<number, number>();
  for (const instr of instructions) latOf.set(instr.line, getLatency(instr.op));

  const dataEdges = dependencies.filter(d => d.type === 'data');
  const succs = new Map<number, number[]>();
  const preds = new Map<number, number[]>();
  const lines = new Set<number>();
  for (const e of dataEdges) {
    lines.add(e.from);
    lines.add(e.to);
    if (!succs.has(e.from)) succs.set(e.from, []);
    succs.get(e.from)!.push(e.to);
    if (!preds.has(e.to)) preds.set(e.to, []);
    preds.get(e.to)!.push(e.from);
  }

  const roots = [...lines].filter(l => !preds.has(l));

  // Topological sort (data edges only → guaranteed DAG)
  const order: number[] = [];
  const state = new Map<number, number>();
  const visit = (l: number) => {
    if (state.get(l) === 2) return;
    if (state.get(l) === 1) return;
    state.set(l, 1);
    for (const s of succs.get(l) || []) visit(s);
    state.set(l, 2);
    order.push(l);
  };
  for (const l of [...lines].sort((a, b) => a - b)) visit(l);
  const topo = [...order].reverse(); // parents before children

  // Longest distance from any root (edges weighted by source latency)
  const distFromStart = new Map<number, number>();
  for (const l of roots) distFromStart.set(l, 0);
  for (const l of topo) {
    const d = distFromStart.get(l) ?? 0;
    for (const s of succs.get(l) || []) {
      const cand = d + (latOf.get(l) || 1);
      if (cand > (distFromStart.get(s) ?? -1)) distFromStart.set(s, cand);
    }
  }

  // Longest distance from any exit (children first)
  const distToEnd = new Map<number, number>();
  for (const l of lines) if (!succs.has(l)) distToEnd.set(l, 0);
  for (const l of [...topo].reverse()) {
    const best = Math.max(0, ...(succs.get(l) || []).map(s => (latOf.get(l) || 1) + (distToEnd.get(s) ?? 0)));
    distToEnd.set(l, best);
  }

  const criticalLength = Math.max(0, ...[...lines].map(l => (distFromStart.get(l) ?? 0) + (latOf.get(l) || 1)));
  const criticalNodes = new Set<number>();
  for (const l of lines) {
    if ((distFromStart.get(l) ?? 0) + (latOf.get(l) || 1) + (distToEnd.get(l) ?? 0) === criticalLength) {
      criticalNodes.add(l);
    }
  }

  const criticalEdges = new Set<string>();
  for (const e of dataEdges) {
    if (criticalNodes.has(e.from) && criticalNodes.has(e.to)
        && (distFromStart.get(e.to) ?? 0) === (distFromStart.get(e.from) ?? 0) + (latOf.get(e.from) || 1)) {
      criticalEdges.add(`${e.from}->${e.to}`);
    }
  }

  return { criticalNodes, criticalEdges, criticalLength };
}

/**
 * Main entry: compute instruction schedule for a method's TAC.
 */
export function computeSchedule(
  instructions: TacInstruction[],
): SchedulingResult {
  const dependencies = buildDependencyGraph(instructions);
  const cycleLog: CycleInfo[] = [];
  const schedule = listSchedule(instructions, dependencies, 2, cycleLog);
  const serial = listSchedule(instructions, dependencies, 1);

  const criticalPath = schedule.length > 0
    ? Math.max(...schedule.map(s => s.cycle)) + 1
    : 0;
  const serialCycles = serial.length > 0
    ? Math.max(...serial.map(s => s.cycle)) + 1
    : 0;

  // Normalize cycle breakdown: one entry per cycle from 0..maxCycle,
  // filling gaps (stall cycles with nothing ready) as empty rows.
  const infoByCycle = new Map<number, CycleInfo>();
  for (const c of cycleLog) infoByCycle.set(c.cycle, c);
  const issuedByCycle = new Map<number, number[]>();
  for (const e of schedule) {
    const arr = issuedByCycle.get(e.cycle) || [];
    arr.push(e.tacLine);
    issuedByCycle.set(e.cycle, arr);
  }
  const maxCycle = Math.max(0, criticalPath - 1, ...[...infoByCycle.keys()]);
  const cycleBreakdown: CycleInfo[] = [];
  for (let cycle = 0; cycle <= maxCycle; cycle++) {
    const info = infoByCycle.get(cycle);
    cycleBreakdown.push({
      cycle,
      issued: info?.issued ?? issuedByCycle.get(cycle) ?? [],
      ready: info?.ready ?? [],
      stalled: info?.stalled ?? [],
    });
  }

  return {
    dependencies,
    schedule,
    criticalPath,
    originalCycles: instructions.filter(i => i.op !== 'label' && i.op !== 'method_start' && i.op !== 'method_end').length,
    scheduledCycles: criticalPath,
    serialCycles,
    cycleBreakdown,
    criticalPathInfo: computeCriticalPath(instructions, dependencies),
  };
}
