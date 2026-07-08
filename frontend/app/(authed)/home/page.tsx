"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
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
      mobileHeader={<MobileTopBar />}
      left={<StoryCardPanel />}
      right={<DashboardPanel />}
    />
  );
}

/** Date + profile, shown above the book on mobile only (hidden on desktop,
 *  where the same info lives at the top of the dashboard panel). */
function MobileTopBar() {
  return (
    <div className={styles.mobileTopBar}>
      <DateFull className={styles.mobileTopBarDate} />
      <ProfileChip />
    </div>
  );
}

/** Profile link (name + avatar). Reads the current user itself so it can be
 *  reused in both the mobile top bar and the desktop dashboard. */
function ProfileChip() {
  const { data: user, isLoading: userLoading } = useGetMeQuery();
  return (
    <Link href="/profile" aria-label="ไปหน้าโปรไฟล์" className={styles.profileLink}>
      <span className={styles.profileName}>
        {userLoading
          ? <PageSpinner variant="small" label="กำลังโหลด…" />
          : (user?.characterName || "โปรไฟล์")
        }
      </span>
      <div className={styles.avatarWrapper}>
        {user?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className={styles.avatarImg} />
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
  return (
    <div className={styles.dashboardPanel}>
      {/* Date — desktop only (mobile shows it in the top bar) */}
      <DateFull className={styles.dashDateDesktop} />

      {/* Profile link — desktop only (mobile shows it in the top bar) */}
      <div className={styles.profileLinkWrapper}>
        <ProfileChip />
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
            <Heart
              key={i}
              size={48}
              color="#0e8dba"
              fill="#0e8dba"
            />
          ))}
        </div>
        <h2 className={`${styles.cardTitle} ${styles.minigameTitle}`}>
          Minigame
        </h2>
      </Link>

    </div>
  );
}
