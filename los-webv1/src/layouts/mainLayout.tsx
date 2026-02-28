import React from "react";
import { Navbar } from "./navbar";
import Footer from "./Footer";

interface MainLayoutProps {
  children: React.ReactNode;
  title: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <>
      <Navbar />
      <div className="h-full md:h-full  ">{children}</div>
      <Footer />
    </>
  );
};

export default MainLayout;
