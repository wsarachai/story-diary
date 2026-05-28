import { apiSlice } from "./apiSlice";
import { authApi } from "./authApi";
import type { UpdateUserRequest, UserProfile } from "@/types/user";

export const userApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    updateProfile: builder.mutation<UserProfile, UpdateUserRequest>({
      query: (body) => ({
        url: "/users/me",
        method: "PATCH",
        body,
      }),
      transformResponse: (res: { user: UserProfile }) => res.user,
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(authApi.util.upsertQueryData("getMe", undefined, data));
        } catch {
          // leave cache as-is on failure
        }
      },
    }),
  }),
});

export const { useUpdateProfileMutation } = userApi;
