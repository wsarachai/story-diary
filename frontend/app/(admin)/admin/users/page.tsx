"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import { useGetMeQuery } from "@/store/authApi";
import { useGetAdminUsersQuery, useChangeUserRoleMutation, type UserSummary } from "@/store/adminApi";
import styles from "@/components/Admin.module.css";

const ROLE_LABEL: Record<UserSummary["role"], string> = {
  user: "User",
  admin: "Admin",
  rootAdmin: "Root Admin",
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { data: me, isLoading: meLoading } = useGetMeQuery();
  const { data: users, isLoading: usersLoading } = useGetAdminUsersQuery();
  const [changeRole] = useChangeUserRoleMutation();

  useEffect(() => {
    if (!meLoading && me?.role !== "rootAdmin") {
      router.replace("/admin");
    }
  }, [meLoading, me, router]);

  if (meLoading || me?.role !== "rootAdmin") {
    return <div className={styles.adminLoading}>กำลังโหลด…</div>;
  }

  async function handleRoleChange(userId: string, role: "user" | "admin") {
    await changeRole({ id: userId, role });
  }

  return (
    <div className={styles.adminLayout}>
      <AdminSidebar />
      <main className={styles.adminMain}>
        <div className={styles.adminPageHeader}>
          <h1 className={styles.adminPageTitle}>User Management</h1>
        </div>

        {usersLoading ? (
          <p className={styles.adminEmpty}>กำลังโหลด…</p>
        ) : !users?.length ? (
          <p className={styles.adminEmpty}>ไม่มีผู้ใช้ในระบบ</p>
        ) : (
          <div className={styles.adminTableWrap}>
            <table className={styles.adminTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Change Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.tel}</td>
                    <td>
                      <span className={`${styles.adminRoleBadge} ${styles[`role${u.role.charAt(0).toUpperCase()}${u.role.slice(1)}`]}`}>
                        {ROLE_LABEL[u.role]}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString("th-TH")}</td>
                    <td>
                      {u.role === "rootAdmin" ? (
                        <span className={styles.adminRoleFixed}>—</span>
                      ) : (
                        <select
                          className={styles.adminRoleSelect}
                          value={u.role}
                          onChange={(e) =>
                            handleRoleChange(u.id, e.target.value as "user" | "admin")
                          }
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
