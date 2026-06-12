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
      async onQueryStarted(body, { dispatch, queryFulfilled }) {
        // Optimistic: UpdateUserRequest is a strict subset of UserProfile,
        // so the patch fields can be merged into the getMe cache directly.
        const patch = dispatch(
          authApi.util.updateQueryData("getMe", undefined, (draft) => {
            if (draft) Object.assign(draft, body);
          })
        );
        try {
          // Replace with the server's normalized profile once confirmed.
          const { data } = await queryFulfilled;
          dispatch(authApi.util.upsertQueryData("getMe", undefined, data));
        } catch {
          patch.undo();
        }
      },
    }),
  }),
});

export const { useUpdateProfileMutation } = userApi;
