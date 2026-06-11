import React from "react";

export class WebGLErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.warn("[WebGL] 3D canvas unavailable, using CSS fallback:", error.message);
  }

  render() {
    if (this.state.failed) {
      return this.props.fallback || null;
    }
    return this.props.children;
  }
}
