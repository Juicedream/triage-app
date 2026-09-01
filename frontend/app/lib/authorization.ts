import { serverFetch } from "@/utils/serverFetch";

const dashboardAccessList = ["admin", "agent"];
export async function canAccessDashboard() {
  try {
    const response = await serverFetch("/auth/me", {
      method: "GET",
    });
    const data = await response.json();
    console.log(data);
    if (!dashboardAccessList.includes(String(data?.role).toLowerCase())) {
      return false;
    }
    if (!response.ok) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("An error occurred:", error);
    return false;
  }
}
