package com.compilervisualizer.controller;

import com.compilervisualizer.config.GlobalExceptionHandler;
import com.compilervisualizer.config.SecurityConfig;
import com.compilervisualizer.dto.CompileRequest;
import com.compilervisualizer.dto.CompileResponse;
import com.compilervisualizer.exception.RateLimitExceededException;
import com.compilervisualizer.security.JwtAuthenticationFilter;
import com.compilervisualizer.security.JwtTokenProvider;
import com.compilervisualizer.service.CompileService;
import com.compilervisualizer.service.RateLimitGuard;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CompileController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@ActiveProfiles("test")
class CompileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CompileService compileService;

    @MockBean
    private RateLimitGuard rateLimitGuard;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private UserDetailsService userDetailsService;

    @Test
    void compileReturnsFullResponse() throws Exception {
        when(compileService.compileAndExecute(any(), any(), any()))
            .thenReturn(CompileResponse.builder().executionOutput("Hello").build());

        mockMvc.perform(post("/api/compile")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(
                    CompileRequest.builder().sourceCode("class A {}").build())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.executionOutput").value("Hello"));
    }

    @Test
    void rejectsBlankSourceCodeWith400() throws Exception {
        mockMvc.perform(post("/api/compile")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(
                    CompileRequest.builder().sourceCode("   ").build())))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void rejectsInvalidEntryClassName() throws Exception {
        mockMvc.perform(post("/api/compile")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(
                    CompileRequest.builder().sourceCode("class A {}").entryClassName("bad name!").build())))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void mapsRateLimitTo429WithStructuredError() throws Exception {
        doThrow(new RateLimitExceededException("Rate limit exceeded"))
            .when(rateLimitGuard).checkCompile(any());

        mockMvc.perform(post("/api/compile")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(
                    CompileRequest.builder().sourceCode("class A {}").build())))
            .andExpect(status().isTooManyRequests())
            .andExpect(jsonPath("$.status").value(429))
            .andExpect(jsonPath("$.message").value("Rate limit exceeded"));
    }
}