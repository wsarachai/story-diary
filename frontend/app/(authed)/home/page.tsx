"use client";

import Link from "next/link";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import Image from "next/image";
import { useGetMeQuery } from "@/store/authApi";
import { DateFull } from "@/components/DateBadge";
import PageSpinner from "@/components/PageSpinner";
import styles from "./HomePage.module.css";
import sharedStyles from "@/components/Shared.module.css";

/**
 * s004 Home Screen — authenticated entry hub.
 * Left page: story card preview.
 * Right page: feature cards for habit tracker + minigame.
 */
export default function HomePage() {
  return (
    <BookShellLayout
      tight
      rail={<IconRail />}
      left={<StoryCardPanel />}
      right={<DashboardPanel />}
    />
  );
}

function StoryCardPanel() {
  return (
    <div className={styles.storyPanel}>
      <Link
        href="/chapters"
        aria-label="ไปหน้าเนื้อเรื่อง"
        className={`${sharedStyles.storyLink} ${styles.storyCardLink}`}
      >
        <article className={styles.storyArticle}>
          <h1 className={styles.storyTitle}>
            เนื้อเรื่อง
          </h1>
        </article>
      </Link>
    </div>
  );
}

function DashboardPanel() {
  const { data: user, isLoading: userLoading } = useGetMeQuery();

  return (
    <div className={styles.dashboardPanel}>
      {/* Date */}
      <DateFull />

      {/* Profile link */}
      <div className={styles.profileLinkWrapper}>
        <Link
          href="/profile"
          aria-label="ไปหน้าโปรไฟล์"
          className={styles.profileLink}
        >
          <span className={styles.profileName}>
            {userLoading
              ? <PageSpinner variant="small" label="กำลังโหลด…" />
              : (user?.characterName || "โปรไฟล์")
            }
          </span>
          <div className={styles.avatarWrapper}>
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                className={styles.avatarImg}
              />
            ) : (
              <Image
                src="/images/chapter-speaker-girl-transparent.png"
                alt=""
                width={24}
                height={24}
                className={styles.avatarPlaceholder}
              />
            )}
          </div>
        </Link>
      </div>

      {/* Habit tracker card */}
      <Link
        href="/habit"
        aria-label="ไปหน้า Habit tracker"
        className={styles.habitCard}
      >
        <h2 className={styles.cardTitle}>
          Habit tracker
        </h2>
      </Link>

      {/* Minigame card */}
      <Link
        href="/minigame"
        aria-label="ไปหน้ามินิเกม"
        className={styles.minigameCard}
      >
        <div
          aria-hidden="true"
          className={styles.heartContainer}
        >
          {[0, 1, 2].map((i) => (
            <Image
              key={i}
              src="/icons/heart.svg"
              alt=""
              width={48}
              height={48}
            />
          ))}
        </div>
        <h2 className={styles.cardTitle}>
          Minigame
        </h2>
      </Link>

    </div>
  );
}
