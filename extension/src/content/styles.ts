export const overlayStyles = `
:host {
  all: initial;
  z-index: 2147483647;
  position: fixed;
  inset: 0;
  pointer-events: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.sharedom-hidden {
  display: none !important;
}

.sharedom-status-pill {
  position: fixed;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(18, 18, 24, 0.94);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #f4f4f5;
  border: 1px solid rgba(255, 255, 255, 0.14);
  padding: 8px 16px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05);
  pointer-events: auto;
  user-select: none;
  font-size: 13px;
  font-weight: 500;
  z-index: 2147483647;
  animation: sharedomSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.sharedom-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
  animation: sharedomPulse 1.8s infinite;
}

.sharedom-status-title {
  color: #ffffff;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.sharedom-shortcut-group {
  display: flex;
  align-items: center;
  gap: 6px;
  border-left: 1px solid rgba(255, 255, 255, 0.12);
  padding-left: 12px;
}

.sharedom-kbd {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #d4d4d8;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  line-height: 1;
}

.sharedom-close-pill-btn {
  background: transparent;
  border: none;
  color: #a1a1aa;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.sharedom-close-pill-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.sharedom-highlight-box {
  position: fixed;
  pointer-events: none;
  border: 2px solid #6366f1;
  background: rgba(99, 102, 241, 0.15);
  border-radius: 4px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.35), 0 0 24px rgba(99, 102, 241, 0.25);
  transition: top 0.05s ease-out, left 0.05s ease-out, width 0.05s ease-out, height 0.05s ease-out;
  z-index: 2147483645;
}

.sharedom-highlight-tag {
  position: absolute;
  top: -28px;
  left: 0;
  background: #0f172a;
  color: #f8fafc;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 5px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  white-space: nowrap;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 6px;
}

.sharedom-highlight-tag.flipped-down {
  top: auto;
  bottom: -28px;
}

.sharedom-tag-name {
  color: #818cf8;
  font-weight: 700;
}

.sharedom-tag-class {
  color: #94a3b8;
}

.sharedom-tag-size {
  color: #38bdf8;
  border-left: 1px solid rgba(255, 255, 255, 0.15);
  padding-left: 6px;
}

.sharedom-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  z-index: 2147483646;
  animation: sharedomFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  padding: 16px;
}

.sharedom-modal-card {
  background: #111116;
  color: #fafafa;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  width: 540px;
  max-width: calc(100vw - 32px);
  max-height: 90vh;
  box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: sharedomScaleUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.sharedom-modal-header {
  padding: 18px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.sharedom-modal-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sharedom-modal-logo {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, #6366f1, #06b6d4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: 800;
  font-size: 14px;
}

.sharedom-modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: -0.01em;
}

.sharedom-modal-subtitle {
  font-size: 12px;
  color: #a1a1aa;
}

.sharedom-icon-btn {
  background: transparent;
  border: none;
  color: #71717a;
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.sharedom-icon-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.sharedom-modal-body {
  padding: 20px 22px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.sharedom-preview-container {
  width: 100%;
  min-height: 180px;
  max-height: 300px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-color: #1c1c24;
  background-image: 
    linear-gradient(45deg, #262633 25%, transparent 25%), 
    linear-gradient(-45deg, #262633 25%, transparent 25%), 
    linear-gradient(45deg, transparent 75%, #262633 75%), 
    linear-gradient(-45deg, transparent 75%, #262633 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

.sharedom-preview-img {
  max-width: 100%;
  max-height: 290px;
  object-fit: contain;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
  border-radius: 4px;
}

.sharedom-preview-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #a1a1aa;
  font-size: 13px;
}

.sharedom-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: sharedomSpin 0.8s linear infinite;
}

.sharedom-preview-meta {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  color: #e4e4e7;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.sharedom-controls-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.sharedom-control-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sharedom-control-label {
  font-size: 12px;
  font-weight: 500;
  color: #a1a1aa;
}

.sharedom-select-wrap {
  position: relative;
}

.sharedom-select {
  width: 100%;
  background: #1e1e26;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #ffffff;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  outline: none;
  cursor: pointer;
  appearance: none;
  transition: all 0.15s ease;
}

.sharedom-select:hover {
  border-color: rgba(255, 255, 255, 0.22);
}

.sharedom-select:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25);
}

.sharedom-btn-group {
  display: flex;
  border-radius: 8px;
  background: #1e1e26;
  border: 1px solid rgba(255, 255, 255, 0.12);
  overflow: hidden;
}

.sharedom-btn-option {
  flex: 1;
  background: transparent;
  border: none;
  color: #a1a1aa;
  padding: 8px 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}

.sharedom-btn-option:not(:last-child) {
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}

.sharedom-btn-option:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.04);
}

.sharedom-btn-option.active {
  background: #6366f1;
  color: #ffffff;
}

.sharedom-btn-option:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: transparent;
  color: #a1a1aa;
}

.sharedom-control-group[hidden] {
  display: none;
}

.sharedom-color-picker-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1e1e26;
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 4px 8px;
  border-radius: 8px;
}

.sharedom-color-input {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  padding: 0;
}

.sharedom-color-label {
  font-size: 12px;
  color: #ffffff;
  font-family: ui-monospace, monospace;
}

.sharedom-modal-footer {
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: #0d0d12;
}

.sharedom-footer-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sharedom-footer-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sharedom-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 38px;
  min-height: 38px;
  max-height: 38px;
  padding: 0 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
  outline: none;
  user-select: none;
  box-sizing: border-box;
}

.sharedom-btn-icon {
  width: 38px;
  height: 38px;
  min-width: 38px;
  max-width: 38px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.sharedom-btn svg {
  flex-shrink: 0;
}

.sharedom-btn-secondary {
  background: #24242e;
  color: #f4f4f5;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.sharedom-btn-secondary:hover {
  background: #2e2e3a;
  border-color: rgba(255, 255, 255, 0.18);
}

.sharedom-btn-copylogs {
  background: rgba(167, 139, 250, 0.12);
  color: #c4b5fd;
  border: 1px solid rgba(167, 139, 250, 0.28);
}

.sharedom-btn-copylogs:hover {
  background: rgba(167, 139, 250, 0.22);
  color: #ffffff;
  border-color: rgba(167, 139, 250, 0.5);
  transform: translateY(-1px);
}

.sharedom-btn-copylogs:active {
  transform: translateY(0);
}

.sharedom-btn-copynetwork {
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.28);
}

.sharedom-btn-copynetwork:hover {
  background: rgba(56, 189, 248, 0.22);
  color: #ffffff;
  border-color: rgba(56, 189, 248, 0.5);
  transform: translateY(-1px);
}

.sharedom-btn-copynetwork:active {
  transform: translateY(0);
}

.sharedom-btn-pdf {
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.28);
}

.sharedom-btn-pdf:hover {
  background: rgba(239, 68, 68, 0.22);
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.5);
  transform: translateY(-1px);
}

.sharedom-btn-pdf:active {
  transform: translateY(0);
}

.sharedom-btn-primary {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
}

.sharedom-btn-primary:hover {
  background: linear-gradient(135deg, #4f46e5, #4338ca);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
  transform: translateY(-1px);
}

.sharedom-btn-primary:active {
  transform: translateY(0);
}

.sharedom-btn-ghost {
  background: transparent;
  color: #a1a1aa;
  padding: 8px 12px;
}

.sharedom-btn-ghost:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.sharedom-toast-container {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 2147483647;
  pointer-events: none;
}

.sharedom-toast {
  background: #09090b;
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.16);
  padding: 10px 18px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08);
  animation: sharedomToastIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: auto;
}

@keyframes sharedomSlideDown {
  from {
    opacity: 0;
    transform: translate(-50%, -12px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

@keyframes sharedomFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes sharedomScaleUp {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes sharedomPulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.85);
  }
}

@keyframes sharedomSpin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes sharedomToastIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.sharedom-pagination-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 10px;
  width: 100%;
}

.sharedom-page-btn {
  background: #1e1e2c;
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #f1f5f9;
  border-radius: 8px;
  padding: 5px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.15s ease;
}

.sharedom-page-btn:hover:not(:disabled) {
  background: #2a2a3e;
  border-color: rgba(167, 139, 250, 0.4);
  transform: translateY(-1px);
}

.sharedom-page-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  transform: none !important;
}

.sharedom-page-indicator {
  font-size: 12.5px;
  font-weight: 600;
  color: #cbd5e1;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  min-width: 60px;
  text-align: center;
}

.sharedom-area-layer {
  position: fixed;
  inset: 0;
  pointer-events: auto;
  cursor: crosshair;
  background: rgba(0, 0, 0, 0.35);
  user-select: none;
  touch-action: none;
  z-index: 2147483646;
}

.sharedom-area-layer.is-selecting {
  background: transparent;
}

.sharedom-area-hint {
  position: absolute;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(18, 18, 24, 0.94);
  color: #f4f4f5;
  border: 1px solid rgba(255, 255, 255, 0.14);
  padding: 8px 16px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}

.sharedom-area-selection {
  position: absolute;
  border: 1px solid #ffffff;
  outline: 1px dashed #6366f1;
  outline-offset: -1px;
  box-shadow: 0 0 0 100vmax rgba(0, 0, 0, 0.45);
  pointer-events: none;
}

.sharedom-area-size {
  position: absolute;
  left: 0;
  bottom: -26px;
  background: #0f172a;
  color: #38bdf8;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 5px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  white-space: nowrap;
}

.sharedom-annotator {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: rgba(9, 9, 11, 0.94);
  pointer-events: auto;
  z-index: 2147483647;
  animation: sharedomFadeIn 0.15s ease;
}

.sharedom-annotator-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 16px;
  background: #111116;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sharedom-annotator-group {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px 0 0;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.sharedom-annotator-color {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.25);
  cursor: pointer;
  transition: transform 0.12s ease;
}

.sharedom-annotator-color:hover {
  transform: scale(1.1);
}

.sharedom-annotator-color.active {
  border-color: #ffffff;
  box-shadow: 0 0 0 2px #6366f1;
}

.sharedom-annotator-size {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #1e1e26;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sharedom-annotator-size span {
  display: block;
  border-radius: 50%;
  background: #e4e4e7;
}

.sharedom-annotator-size.active {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.25);
}

.sharedom-annotator-spacer {
  flex: 1;
}

.sharedom-annotator-stage {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.sharedom-annotator-canvas {
  max-width: 100%;
  max-height: 100%;
  cursor: crosshair;
  touch-action: none;
  border-radius: 4px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.12);
}

@media (max-width: 600px) {
  .sharedom-modal-footer {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 12px 16px;
  }
  .sharedom-footer-left,
  .sharedom-footer-right {
    width: 100%;
    display: flex;
    justify-content: stretch;
    gap: 8px;
  }
  .sharedom-footer-left .sharedom-btn,
  .sharedom-footer-right .sharedom-btn {
    flex: 1 1 0;
    min-width: 0;
    padding: 0 8px;
    font-size: 12px;
  }
}
`;
