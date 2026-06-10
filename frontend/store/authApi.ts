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
      // Do NOT use invalidatesTags here: it dispatches synchronously and
      // triggers a getMe refetch whose prepareHeaders runs before the token
      // reaches localStorage, causing a 401 redirect loop. Instead, populate
      // the getMe cache directly once we have the token.
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          localStorage.setItem("auth_token", data.token);
          dispatch(authApi.util.upsertQueryData("getMe", undefined, data.user));
        } catch {
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
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          localStorage.setItem("auth_token", data.token);
          dispatch(authApi.util.upsertQueryData("getMe", undefined, data.user));
        } catch {
          localStorage.removeItem("auth_token");
        }
      },
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      // Do NOT use invalidatesTags here: the synchronous refetch it triggers
      // fires before onQueryStarted removes the token, so getMe succeeds with
      // the stale JWT and the user appears still authenticated.
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch {
          // ignore
        } finally {
          localStorage.removeItem("auth_token");
          dispatch(authApi.util.upsertQueryData("getMe", undefined, null));
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
