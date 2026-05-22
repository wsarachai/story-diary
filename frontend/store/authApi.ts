import { apiSlice } from "./apiSlice";
import type { User, LoginInput, RegisterRequest, AuthResponse } from "@/types/auth";

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query<User | null, void>({
      query: () => "/auth/me",
      transformResponse: (response: { user: User }) => response.user,
      providesTags: ["Auth"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch (err: any) {
          if (err.error?.status === 401) {
            localStorage.removeItem("auth_token");
          }
        }
      },
    }),
    login: builder.mutation<AuthResponse, LoginInput>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["Auth"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          localStorage.setItem("auth_token", data.token);
        } catch (err) {
          localStorage.removeItem("auth_token");
        }
      },
    }),
    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (userData) => ({
        url: "/auth/register",
        method: "POST",
        body: userData,
      }),
      invalidatesTags: ["Auth"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          localStorage.setItem("auth_token", data.token);
        } catch (err) {
          localStorage.removeItem("auth_token");
        }
      },
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      invalidatesTags: ["Auth"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch {
          // ignore
        } finally {
          localStorage.removeItem("auth_token");
          // Clear all API state on logout
          window.location.reload(); 
        }
      },
    }),
  }),
});

export const {
  useGetMeQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
} = authApi;
