package com.backend.backend.controllers;

import com.backend.backend.models.Resource;
import com.backend.backend.services.ResourceService;

// NEW: Import your security-related files so we can mock them
import com.backend.backend.services.CustomUserDetailsService;
import com.backend.backend.repositories.UserRepository;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.oauth2.client.servlet.OAuth2ClientAutoConfiguration;
import org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration;

import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageImpl;

import java.util.Arrays;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(
        value = ResourceController.class, 
        excludeAutoConfiguration = {
                SecurityAutoConfiguration.class,
                OAuth2ClientAutoConfiguration.class,
                OAuth2ResourceServerAutoConfiguration.class
        }
)
@AutoConfigureMockMvc(addFilters = false)
public class ResourceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ResourceService resourceService;

    // --- NEW: Dummy beans to prevent SecurityConfig from crashing ---
    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    @MockBean
    private UserRepository userRepository;
    // ----------------------------------------------------------------

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    public void testGetAllResources_Success() throws Exception {
        // 1. Arrange: Create fake data
        Resource r1 = new Resource("Main Hall", "LECTURE_HALL", 200, "Block A", "08:00-17:00", "ACTIVE");
        r1.setId("1");
        
        // Tell our mock service what to return when the controller asks for data
       when(resourceService.searchAndFilterResources(anyString(), anyString(), anyString(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Arrays.asList(r1)));

        // 2 & 3. Act & Assert: Simulate a GET request and check the results
        mockMvc.perform(get("/api/resources")
                .param("searchTerm", "")
                .param("type", "ALL")
                .param("status", "ALL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Main Hall"))
                .andExpect(jsonPath("$[0].type").value("LECTURE_HALL"));
    }

    @Test
    public void testCreateResource_Success() throws Exception {
        // 1. Arrange
        Resource newResource = new Resource("Mini Lab", "LAB", 30, "Block B", "08:00-17:00", "ACTIVE");
        
        when(resourceService.createResource(any(Resource.class))).thenReturn(newResource);

        // 2 & 3. Act & Assert: Simulate a POST request with valid JSON
        mockMvc.perform(post("/api/resources")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newResource)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Mini Lab"));
    }

    @Test
    public void testCreateResource_ValidationError() throws Exception {
        // 1. Arrange: Create an INVALID resource (Blank name, negative capacity)
        Resource invalidResource = new Resource("", "LAB", -5, "Block B", "08:00-17:00", "ACTIVE");

        // 2 & 3. Act & Assert: Verify that the @Valid annotation blocks it and returns a 400 Bad Request
        mockMvc.perform(post("/api/resources")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidResource)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.name").exists())
                .andExpect(jsonPath("$.errors.capacity").exists());
    }
}