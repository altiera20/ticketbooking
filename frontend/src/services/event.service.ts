import axios from 'axios';
import { Event, EventFilters, EventType } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface PaginationResponse {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface EventsResponse {
  events: Event[];
  pagination: PaginationResponse;
}

interface EventResponse {
  event: Event;
}

class EventService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
  });

  constructor() {
    // Add auth token to requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle auth errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get events with optional filters
   */
  async getEvents(filters?: EventFilters): Promise<EventsResponse> {
    try {
      // Build query parameters
      const params: Record<string, any> = {};
      if (filters) {
        if (filters.type) params.type = filters.type;
        if (filters.minPrice !== undefined) params.minPrice = filters.minPrice;
        if (filters.maxPrice !== undefined) params.maxPrice = filters.maxPrice;
        if (filters.date) params.date = filters.date;
        if (filters.venue) params.venue = filters.venue;
        if (filters.search) params.search = filters.search;
        if (filters.sortBy) params.sortBy = filters.sortBy;
        if (filters.sortOrder) params.sortOrder = filters.sortOrder;
        if (filters.page) params.page = filters.page;
        if (filters.limit) params.limit = filters.limit;
      }

      const response = await this.api.get<EventsResponse>('/events', { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching events:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch events');
    }
  }

  /**
   * Get event by ID
   */
  async getEventById(id: string): Promise<Event> {
    try {
      const response = await this.api.get<EventResponse>(`/events/${id}`);
      return response.data.event;
    } catch (error: any) {
      console.error(`Error fetching event ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Failed to fetch event details');
    }
  }

  /**
   * Create a new event (vendor only)
   */
  async createEvent(eventData: Partial<Event>): Promise<Event> {
    try {
      const response = await this.api.post<EventResponse>('/events', eventData);
      return response.data.event;
    } catch (error: any) {
      console.error('Error creating event:', error);
      throw new Error(error.response?.data?.message || 'Failed to create event');
    }
  }

  /**
   * Update an event (vendor only)
   */
  async updateEvent(id: string, eventData: Partial<Event>): Promise<Event> {
    try {
      const response = await this.api.put<EventResponse>(`/events/${id}`, eventData);
      return response.data.event;
    } catch (error: any) {
      console.error(`Error updating event ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Failed to update event');
    }
  }

  /**
   * Delete an event (vendor only)
   */
  async deleteEvent(id: string): Promise<void> {
    try {
      await this.api.delete(`/events/${id}`);
    } catch (error: any) {
      console.error(`Error deleting event ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Failed to delete event');
    }
  }
}

export const eventService = new EventService();
