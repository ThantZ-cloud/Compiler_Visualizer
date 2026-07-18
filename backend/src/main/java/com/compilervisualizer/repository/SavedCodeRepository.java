package com.compilervisualizer.repository;

import com.compilervisualizer.model.SavedCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SavedCodeRepository extends JpaRepository<SavedCode, Long> {

    List<SavedCode> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<SavedCode> findByUserIdAndTitleContainingIgnoreCase(Long userId, String title);
}
