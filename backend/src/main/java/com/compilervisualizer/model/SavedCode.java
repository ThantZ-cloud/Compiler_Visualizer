package com.compilervisualizer.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "saved_code")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SavedCode {

    @Id
    @GeneratedValue(strategy = GenerationType.TABLE, generator = "saved_code_gen")
    @TableGenerator(name = "saved_code_gen", table = "id_generator", pkColumnName = "gen_name", pkColumnValue = "saved_code_id", valueColumnName = "gen_value", allocationSize = 1)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "folder_id")
    private Folder folder;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String sourceCode;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
