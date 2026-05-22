import { apiSlice } from "./apiSlice";
import type { EBookCollection } from "@/types/ebook";

export const ebookApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getEBooks: builder.query<EBookCollection, void>({
      query: () => "/e-books",
      providesTags: ["Chapters"],
    }),
  }),
});

export const { useGetEBooksQuery } = ebookApi;
