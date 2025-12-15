import { create } from 'zustand';
import { apiGet } from '../utils/api';

export const useAdminStore = create((set, get) => ({
    // Data
    events: [],
    users: [],
    bookings: [],
    loading: false,
    error: null,

    // Actions
    fetchAll: async () => {
        set({ loading: true, error: null });
        try {
            const [eRes, uRes, bRes] = await Promise.all([
                apiGet('/events/'),
                apiGet('/users/'),
                apiGet('/bookings/')
            ]);
            set({
                events: eRes.events || eRes || [],
                users: uRes.users || uRes || [],
                bookings: bRes.data || bRes || [],
                loading: false
            });
        } catch (err) {
            console.error(err);
            set({ error: "Failed to load admin data", loading: false });
        }
    },

    // Event Actions
    setEvents: (events) => set({ events }),

    // User Actions
    setUsers: (users) => set({ users }),

    // Booking Actions
    setBookings: (bookings) => set({ bookings }),
}));
