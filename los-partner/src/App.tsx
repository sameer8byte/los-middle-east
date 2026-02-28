import "./App.css";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import InternalPages from "./routes";
import { store } from "./shared/redux/store";
import { ThemeProvider } from "./context/themeProviderContext";
import { ToastProvider } from "./context/toastContext";
import { ActivityTrackerContact } from "./context/activityTrackerContact";
import { AcefoneDialerProvider } from "./features/acefone";

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <ThemeProvider>
          <ToastProvider>
            <ActivityTrackerContact>
              <AcefoneDialerProvider>
                <ToastContainer />
                <InternalPages />
              </AcefoneDialerProvider>
            </ActivityTrackerContact>
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
