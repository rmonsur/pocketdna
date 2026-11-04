import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "../index.css";
import { Landing } from "./Landing";

/* Atlas (Three.js) and Library load on demand; the landing path stays lean. */
const AtlasPage = React.lazy(() => import("./AtlasPage").then((m) => ({ default: m.AtlasPage })));
const LibraryPage = React.lazy(() => import("./LibraryPage").then((m) => ({ default: m.LibraryPage })));

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/atlas" element={<AtlasPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>,
);
