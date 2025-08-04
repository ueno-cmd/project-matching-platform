import { useState, useCallback, useMemo } from 'react';

export const useApi = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const makeRequest = useCallback(async (endpoint, options = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const defaultHeaders = {
        'Content-Type': 'application/json',
      };

      if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(endpoint, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = typeof errorData.error === 'object' 
          ? errorData.error?.message || JSON.stringify(errorData.error)
          : errorData.error || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const get = useCallback((endpoint) => {
    return makeRequest(endpoint, { method: 'GET' });
  }, [makeRequest]);

  const post = useCallback((endpoint, data) => {
    return makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }, [makeRequest]);

  const put = useCallback((endpoint, data) => {
    return makeRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }, [makeRequest]);

  const del = useCallback((endpoint) => {
    return makeRequest(endpoint, { method: 'DELETE' });
  }, [makeRequest]);

  // 返すオブジェクトを安定化
  const api = useMemo(() => ({
    isLoading,
    error,
    get,
    post,
    put,
    delete: del,
    makeRequest,
  }), [isLoading, error, get, post, put, del, makeRequest]);

  return api;
};

export const useProjects = () => {
  const api = useApi();

  const getProjects = useCallback(() => {
    return api.get('/api/projects');
  }, [api.get]);

  const getProject = useCallback((id) => {
    return api.get(`/api/projects/${id}`);
  }, [api.get]);

  const createProject = useCallback((projectData) => {
    return api.post('/api/projects', projectData);
  }, [api.post]);

  const updateProject = useCallback((id, projectData) => {
    return api.put(`/api/projects/${id}`, projectData);
  }, [api.put]);

  const deleteProject = useCallback((id) => {
    return api.delete(`/api/projects/${id}`);
  }, [api.delete]);

  return useMemo(() => ({
    getProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    isLoading: api.isLoading,
    error: api.error,
  }), [getProjects, getProject, createProject, updateProject, deleteProject, api.isLoading, api.error]);
};

export const useUsers = () => {
  const api = useApi();

  const getUsers = useCallback(() => {
    return api.get('/api/users');
  }, [api.get]);

  const getUser = useCallback((id) => {
    return api.get(`/api/users/${id}`);
  }, [api.get]);

  const updateUser = useCallback((id, userData) => {
    return api.put(`/api/users/${id}`, userData);
  }, [api.put]);

  const deleteUser = useCallback((id) => {
    return api.delete(`/api/users/${id}`);
  }, [api.delete]);

  return useMemo(() => ({
    getUsers,
    getUser,
    updateUser,
    deleteUser,
    isLoading: api.isLoading,
    error: api.error,
  }), [getUsers, getUser, updateUser, deleteUser, api.isLoading, api.error]);
};