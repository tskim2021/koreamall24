import { useState } from "react";
import AdminDashboardLayout from "@/components/AdminDashboardLayout";
import AdminProductsTab from "@/components/AdminProductsTab";
import AdminOrdersTab from "@/components/AdminOrdersTab";
import AdminCustomersTab from "@/components/AdminCustomersTab";
import AdminReviewsTab from "@/components/AdminReviewsTab";
import AdminCategoriesTab from "@/components/AdminCategoriesTab";
import AdminAnalyticsTab from "@/components/AdminAnalyticsTab";
import AdminSettingsTab from "@/components/AdminSettingsTab";
import AdminDashboardMain from "@/components/AdminDashboardMain";
import AdminStockTab from "@/components/AdminStockTab";
import AdminBulkActionTab from "@/components/AdminBulkActionTab";

export default function AdminDashboardNew() {
  const [currentTab, setCurrentTab] = useState("dashboard");

  const renderTabContent = () => {
    switch (currentTab) {
      case "dashboard":
        return <AdminDashboardMain />;
      case "products":
        return <AdminProductsTab />;
      case "orders":
        return <AdminOrdersTab />;
      case "customers":
        return <AdminCustomersTab />;
      case "reviews":
        return <AdminReviewsTab />;
      case "categories":
        return <AdminCategoriesTab />;
      case "analytics":
        return <AdminAnalyticsTab />;
      case "settings":
        return <AdminSettingsTab />;
      default:
        return <AdminDashboardMain />;
    }
  };

  return (
    <AdminDashboardLayout currentTab={currentTab} onTabChange={setCurrentTab}>
      {renderTabContent()}
    </AdminDashboardLayout>
  );
}
