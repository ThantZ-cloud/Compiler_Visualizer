package com.compilervisualizer.repository;

import com.compilervisualizer.model.SavedCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SavedCodeRepository extends JpaRepository<SavedCode, Long> {

    Page<SavedCode> findByUserUsernameOrderByUpdatedAtDesc(String username, Pageable pageable);

    Optional<SavedCode> findByIdAndUserUsername(Long id, String username);

    Page<SavedCode> findByUserEmailOrderByUpdatedAtDesc(String email, Pageable pageable);

    Optional<SavedCode> findByIdAndUserEmail(Long id, String email);
}
