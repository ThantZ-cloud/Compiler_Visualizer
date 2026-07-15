package com.compilervisualizer.repository;

import com.compilervisualizer.model.CompilationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CompilationLogRepository extends JpaRepository<CompilationLog, Long> {

    List<CompilationLog> findByUserIdOrderByCompiledAtDesc(Long userId);

    List<CompilationLog> findBySavedCodeIdOrderByCompiledAtDesc(Long savedCodeId);
}
