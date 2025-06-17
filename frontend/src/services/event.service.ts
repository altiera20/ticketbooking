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
    category?: string;
    date?: string;
    search?: string;
  }): Promise<{ events: Event[]; total: number }> {
    try {
      const response = await api.get<{ success: boolean; data: { events: Event[]; total: number } }>('/events', {
        params
      });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error('Failed to fetch events');
    } catch (error) {
      console.error('Get events error:', error);
      throw new Error('Failed to fetch events');
    }
  }

  /**
   * Get event by ID
   * @param id - Event ID
   * @returns Event details
   */
  async getEventById(id: string): Promise<Event> {
    try {
      const response = await api.get<{ success: boolean; data: Event }>(`/events/${id}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error('Event not found');
    } catch (error) {
      console.error('Get event error:', error);
      throw new Error('Failed to fetch event details');
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
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error('Failed to fetch seats');
    } catch (error) {
      console.error('Get event seats error:', error);
      throw new Error('Failed to fetch seats');
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
