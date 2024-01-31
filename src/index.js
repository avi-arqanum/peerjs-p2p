import React from "react";
import ReactDOM from "react-dom/client";
import { Buffer } from "buffer";

import User from "./components/User";

window.Buffer = Buffer;

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<User />);
