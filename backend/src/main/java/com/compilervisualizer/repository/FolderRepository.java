package com.compilervisualizer.repository;

import com.compilervisualizer.model.Folder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FolderRepository extends JpaRepository<Folder, Long> {

    List<Folder> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Folder> findByUserIdAndParentIdOrderByCreatedAtDesc(Long userId, Long parentId);

    List<Folder> findByUserIdAndParentIsNullOrderByCreatedAtDesc(Long userId);

    Optional<Folder> findByIdAndUserId(Long id, Long userId);
}
