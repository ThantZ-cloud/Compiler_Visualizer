package com.compilervisualizer.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "compilation_log")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompilationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "code_id")
    private SavedCode savedCode;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String sourceCode;

    @Column(columnDefinition = "JSON")
    private String tokensJson;

    @Column(columnDefinition = "JSON")
    private String astJson;

    @Column(columnDefinition = "JSON")
    private String symbolTableJson;

    @Column(columnDefinition = "TEXT")
    private String bytecode;

    @Column(columnDefinition = "TEXT")
    private String executionOutput;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime compiledAt;
}
