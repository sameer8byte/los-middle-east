import { SpecificProfileComponent } from "../specificProfile";
import NavigationLink from "./components/navigationLink";

export function ProfileComponent() {
  return (
    <div 
      className="flex flex-col md:flex-row min-h-screen"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      {/* Navigation Sidebar */}
      <div 
        className="w-full md:w-80 md:sticky md:top-0 md:h-screen md:overflow-y-auto md:shadow-sm"
      
      >
        <div className="md:p-0 p-3">
          <NavigationLink />
        </div>
      </div>

      {/* Main Content Area */}
      <div 
        className="flex-1 overflow-y-auto md:max-h-screen"
        style={{ backgroundColor: "var(--color-background)" }}
      >
        <div className="p-3 md:p-6 w-full">
         
            <SpecificProfileComponent />
        </div>
      </div>
    </div>
  );
}
