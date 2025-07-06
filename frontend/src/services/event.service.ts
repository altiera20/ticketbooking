import api from './api';
import { Event, Seat } from '../types/event.types';

class EventService {
  /**
   * Get all events with optional filtering
   * @param params - Filter parameters
   * @returns List of events
   */
  async getEvents(params?: {
    page?: number;
    limit?: number;
    type?: string;
    date?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    venue?: string;
    sortBy?: 'price' | 'date' | 'title';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ events: Event[]; total: number }> {
    try {
      const response = await api.get<{ events: Event[]; pagination: { total: number } }>('/events', {
        params
      });
      
      if (!response.data) {
        throw new Error('No data received from server');
      }

      if (!response.data.events || !Array.isArray(response.data.events)) {
        throw new Error('Invalid events data received from server');
      }
      
      return {
        events: response.data.events,
        total: response.data.pagination?.total || 0
      };
    } catch (error: any) {
      console.error('Get events error:', error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        throw new Error(error.response.data?.message || 'Failed to fetch events');
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error('No response received from server');
      } else {
        // Something happened in setting up the request that triggered an Error
        throw new Error(error.message || 'Failed to fetch events');
      }
    }
  }

  /**
   * Get event by ID
   * @param id - Event ID
   * @returns Event details
   */
  async getEventById(id: string): Promise<Event> {
    try {
      const response = await api.get<{ event: Event }>(`/events/${id}`);
      
      if (!response.data || !response.data.event) {
        throw new Error('Event not found');
      }
      
      return response.data.event;
    } catch (error: any) {
      console.error('Get event error:', error);
      if (error.response?.status === 404) {
        throw new Error('Event not found');
      }
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch event details');
    }
  }

  /**
   * Get seats for an event
   * @param eventId - Event ID
   * @returns List of seats
   */
  async getEventSeats(eventId: string): Promise<Seat[]> {
    try {
      const response = await api.get<{ success: boolean; data: Seat[] }>(`/events/${eventId}/seats`);
      
      if (!response.data || !response.data.success || !response.data.data) {
        throw new Error('Failed to fetch seats');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Get event seats error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch seats');
    }
  }

  /**
   * Get event categories
   * @returns List of categories
   */
  async getCategories(): Promise<string[]> {
    try {
      const response = await api.get<{ success: boolean; data: string[] }>('/events/categories');
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error('Failed to fetch categories');
    } catch (error) {
      console.error('Get categories error:', error);
      throw new Error('Failed to fetch categories');
    }
  }
}

export default new EventService();
