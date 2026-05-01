import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import chaptersReducer from "./chaptersSlice";
import videoClipsReducer from "./videoClipsSlice";
import habitsReducer from "./habitsSlice";
import quizReducer from "./quizSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chapters: chaptersReducer,
    videoClips: videoClipsReducer,
    habits: habitsReducer,
    quiz: quizReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
