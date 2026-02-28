import "./App.css";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { store } from "./redux/store";
import InternalPages from "./router";
import { ThemeProvider } from "./features/theamProvider";
import useFacebookPixel from "./utils/metaPixel";

function App() {
  useFacebookPixel();
  return (
    <Provider store={store}>
      <BrowserRouter>
        <ThemeProvider>
          <InternalPages />
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
