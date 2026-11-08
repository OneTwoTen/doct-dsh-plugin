/**
 * The panel's stylesheet.
 *
 * One string, installed once by `apply` with a `data-personal-hub` marker so a
 * second entry point (the New Session worktree row) does not add a copy. Every
 * colour is a Harness theme token or mixed from one, so light and dark themes
 * both follow the application.
 */
export const GIT_CSS = `
.ph-git{display:flex;flex-direction:column;min-height:0;height:100%;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:12.5px}
.ph-git *{box-sizing:border-box}
.ph-git button{font:inherit;color:inherit}
.ph-git .ph-spacer{flex:1 1 auto;min-width:0}
.ph-git .ph-dim{color:var(--dsw-alias-label-tertiary)}
.ph-git .ph-tiny{font-size:11px}
.ph-git .ph-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.ph-git .ph-ellipsis{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.ph-git .ph-row{display:flex;align-items:center;gap:6px;min-width:0}

/* Header */
.ph-head{display:flex;flex-direction:column;gap:6px;padding:8px 10px 6px;border-bottom:1px solid var(--dsw-alias-border-l3);flex:none}
.ph-repo-row{display:flex;align-items:center;gap:6px;min-width:0}
.ph-repo{font-weight:600;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph-branch-row{display:flex;align-items:center;gap:6px;min-width:0}
.ph-branch-button{display:inline-flex;align-items:center;gap:5px;max-width:100%;padding:2px 6px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-layer-1);cursor:pointer;min-width:0}
.ph-branch-button:hover{background:var(--dsw-alias-bg-layer-2)}
.ph-pill{display:inline-flex;align-items:center;gap:2px;padding:1px 5px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:10.5px;font-variant-numeric:tabular-nums;white-space:nowrap}
.ph-pill[data-tone=warn]{color:var(--dsw-alias-state-warn-primary)}
.ph-pill[data-tone=success]{color:var(--dsw-alias-state-success-primary)}
.ph-chip{display:inline-flex;align-items:center;gap:4px;max-width:100%;padding:1px 6px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
button.ph-chip{cursor:pointer}
button.ph-chip:hover{background:var(--dsw-alias-bg-layer-2)}
.ph-chip[data-tone=success]{color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 40%,transparent)}
.ph-chip[data-tone=warn]{color:var(--dsw-alias-state-warn-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 40%,transparent)}
.ph-chip[data-tone=error]{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 40%,transparent)}
.ph-chip[data-tone=business]{color:var(--dsw-alias-brand-primary);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 40%,transparent)}
.ph-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-label-tertiary);flex:none}
.ph-dot[data-state=open]{background:var(--dsw-alias-state-success-primary)}
.ph-dot[data-state=success]{background:var(--dsw-alias-state-success-primary)}
.ph-dot[data-state=failure]{background:var(--dsw-alias-state-error-primary)}
.ph-dot[data-state=error]{background:var(--dsw-alias-state-error-primary)}
.ph-dot[data-state=pending]{background:var(--dsw-alias-state-warn-primary)}
.ph-dot[data-state=merged]{background:var(--dsw-alias-brand-primary)}
.ph-dot[data-state=closed]{background:var(--dsw-alias-label-tertiary)}
.ph-dot[data-state=draft]{background:var(--dsw-alias-label-secondary)}

/* Actions: one split control, as the reference implementation has */
.ph-actions{display:flex;align-items:stretch;gap:0;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);overflow:hidden;position:relative}
.ph-actions[data-running=true]{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,var(--dsw-alias-border-l1))}
.ph-action-primary{display:flex;align-items:center;gap:6px;flex:1 1 auto;min-width:0;padding:6px 9px;border:0;background:transparent;cursor:pointer;font-weight:600;font-size:12.5px;text-align:left}
.ph-action-primary:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
.ph-action-primary:disabled{cursor:default;color:var(--dsw-alias-label-tertiary)}
.ph-action-caret{display:flex;align-items:center;justify-content:center;width:28px;border:0;border-left:1px solid var(--dsw-alias-border-l3);background:transparent;cursor:pointer;color:var(--dsw-alias-label-secondary)}
.ph-action-caret:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
.ph-action-caret:disabled{cursor:default;opacity:.55}
.ph-action-hint{font-size:11px;color:var(--dsw-alias-label-tertiary);line-height:1.4;margin:0}
.ph-menu{position:absolute;right:0;top:calc(100% + 4px);z-index:50;display:flex;flex-direction:column;min-width:220px;padding:4px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-2);box-shadow:0 10px 28px rgba(0,0,0,.24)}
.ph-menu-item{display:flex;align-items:center;gap:8px;padding:6px 8px;border:0;border-radius:6px;background:transparent;cursor:pointer;text-align:left;font-size:12px}
.ph-menu-item:hover:not(:disabled){background:var(--dsw-alias-bg-layer-1)}
.ph-menu-item:disabled{cursor:default;color:var(--dsw-alias-label-tertiary)}
.ph-menu-hint{padding:4px 8px 6px;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:1.4}
.ph-menu-sep{height:1px;margin:4px 2px;background:var(--dsw-alias-border-l3)}

/* Progress and inline success replace the control */
.ph-progress{display:flex;flex-direction:column;gap:2px;padding:6px 9px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 40%,var(--dsw-alias-border-l1));border-radius:8px;background:var(--dsw-alias-bg-layer-1)}
.ph-progress-row{display:flex;align-items:center;gap:7px;min-width:0}
.ph-progress-text{font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph-progress-elapsed{margin-left:auto;font-size:10.5px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;flex:none}
.ph-progress-output{margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10.5px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph-spinner{width:12px;height:12px;flex:none;border-radius:50%;border:1.5px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 30%,transparent);border-top-color:var(--dsw-alias-brand-primary);animation:ph-spin .8s linear infinite}
@keyframes ph-spin{to{transform:rotate(360deg)}}
.ph-success{display:flex;align-items:center;gap:7px;padding:6px 9px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-success-primary) 40%,var(--dsw-alias-border-l1));border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 10%,var(--dsw-alias-bg-layer-1))}
.ph-success-text{font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph-success-desc{font-size:11px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* Tabs */
.ph-tabs{display:flex;align-items:center;gap:2px;padding:0 6px;border-bottom:1px solid var(--dsw-alias-border-l3);flex:none;overflow-x:auto;scrollbar-width:none}
.ph-tabs::-webkit-scrollbar{display:none}
.ph-tab{display:inline-flex;align-items:center;gap:5px;padding:7px 8px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:12px;white-space:nowrap}
.ph-tab:hover{color:var(--dsw-alias-label-primary)}
.ph-tab[aria-selected=true]{color:var(--dsw-alias-label-primary);border-bottom-color:var(--dsw-alias-brand-primary)}
.ph-tab-count{padding:0 5px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-tertiary);font-size:10px;font-variant-numeric:tabular-nums}

/* Body */
.ph-body{flex:1 1 auto;min-height:0;overflow:auto;overscroll-behavior:contain}
.ph-toolbar{display:flex;align-items:center;gap:6px;padding:6px 10px;border-bottom:1px solid var(--dsw-alias-border-l3);flex:none;flex-wrap:wrap}
.ph-toolbar .ph-spacer{flex:1 1 auto}
.ph-toolbar-title{font-weight:600;font-size:12px}

/* Buttons */
.ph-button{display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:11.5px;white-space:nowrap}
.ph-button:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.ph-button:disabled{opacity:.55;cursor:default}
.ph-button[aria-pressed=true]{border-color:transparent;background:var(--dsw-alias-brand-primary);color:#fff}
.ph-primary{display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:5px 12px;border:1px solid transparent;border-radius:7px;background:var(--dsw-alias-brand-primary);color:#fff;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap}
.ph-primary:disabled{opacity:.55;cursor:default}
.ph-icon-button{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;flex:none}
.ph-icon-button:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.ph-icon-button:disabled{opacity:.5;cursor:default}
.ph-icon-button[data-busy=true] svg{animation:ph-spin .9s linear infinite}
.ph-link{color:var(--dsw-alias-brand-primary);text-decoration:none;cursor:pointer}
.ph-link:hover{text-decoration:underline}

/* Commit box */
.ph-commit{border-top:1px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-layer-1);padding:8px 10px;display:flex;flex-direction:column;gap:6px;flex:none}
.ph-commit-head{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.ph-commit-files{max-height:132px;overflow:auto;border:1px solid var(--dsw-alias-border-l3);border-radius:7px;background:var(--dsw-alias-bg-base)}
.ph-commit-file{display:flex;align-items:center;gap:6px;width:100%;padding:3px 7px;border:0;background:transparent;cursor:pointer;font-size:11.5px;text-align:left;min-width:0}
.ph-commit-file:hover{background:var(--dsw-alias-bg-layer-2)}
.ph-commit-file[data-excluded=true]{color:var(--dsw-alias-label-tertiary)}
.ph-textarea{width:100%;min-height:52px;max-height:160px;resize:vertical;padding:6px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:1.45}
.ph-textarea:focus{outline:1px solid var(--dsw-alias-brand-primary);outline-offset:-1px}
.ph-commit-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.ph-commit-actions .ph-spacer{flex:1 1 auto}
.ph-hint{margin:0;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:1.45}
.ph-error-text{margin:0;color:var(--dsw-alias-state-error-primary);font-size:11.5px;line-height:1.45}

/* Changes / diff stack */
.ph-stack{display:flex;flex-direction:column}
.ph-stack-toolbar{display:flex;align-items:center;gap:6px;padding:6px 10px;border-bottom:1px solid var(--dsw-alias-border-l3);position:sticky;top:0;z-index:6;background:var(--dsw-alias-bg-base);flex-wrap:wrap}
.ph-file{border-bottom:1px solid var(--dsw-alias-border-l3)}
.ph-file-head{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:6px;width:100%;padding:5px 8px;border:0;background:var(--dsw-alias-bg-layer-1);cursor:pointer;text-align:left;min-width:0;min-height:32px}
.ph-file-head:hover{background:var(--dsw-alias-bg-layer-2)}
.ph-file-head[data-expanded=true]{border-bottom:1px solid var(--dsw-alias-border-l3)}
.ph-file-check{flex:none;margin:0;cursor:pointer}
.ph-file-path{display:flex;align-items:baseline;gap:0;min-width:0;flex:1 1 auto;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px}
.ph-file-dir{color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;direction:rtl;text-align:left}
.ph-file-name{color:var(--dsw-alias-label-primary);white-space:nowrap}
.ph-badge{display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;flex:none;border-radius:4px;font-size:9.5px;font-weight:700;font-family:ui-monospace,monospace;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}
.ph-badge[data-tone=success]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 18%,transparent);color:var(--dsw-alias-state-success-primary)}
.ph-badge[data-tone=warn]{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 18%,transparent);color:var(--dsw-alias-state-warn-primary)}
.ph-badge[data-tone=error]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 18%,transparent);color:var(--dsw-alias-state-error-primary)}
.ph-badge[data-tone=business]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 18%,transparent);color:var(--dsw-alias-brand-primary)}
.ph-badge[data-tone=muted]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-tertiary)}
.ph-counts{display:inline-flex;align-items:center;gap:4px;flex:none;font-family:ui-monospace,monospace;font-size:10.5px;font-variant-numeric:tabular-nums}
.ph-glyph{display:inline-flex;align-items:center;flex:none;color:var(--dsw-alias-label-tertiary)}
.ph-bar{display:inline-flex;width:44px;height:4px;border-radius:2px;overflow:hidden;background:var(--dsw-alias-bg-layer-2);flex:none}
.ph-bar-add{display:block;height:100%;background:var(--dsw-alias-state-success-primary)}
.ph-bar-del{display:block;height:100%;background:var(--dsw-alias-state-error-primary)}
.ph-add{color:var(--dsw-alias-state-success-primary)}
.ph-del{color:var(--dsw-alias-state-error-primary)}
.ph-file-body{background:var(--dsw-alias-bg-base)}
.ph-notice{margin:6px 10px;padding:6px 8px;border:1px solid var(--dsw-alias-border-l3);border-radius:7px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-tertiary);font-size:11.5px;line-height:1.45}
.ph-diff{display:flex;flex-direction:column;overflow-x:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px;line-height:1.5}
.ph-diff[data-wrap=true]{overflow-x:hidden}
.ph-hunk-head{padding:2px 10px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-tertiary);font-size:10.5px;white-space:pre;position:sticky;left:0}
.ph-line{display:flex;align-items:flex-start;min-width:0;white-space:pre}
.ph-diff[data-wrap=true] .ph-line{white-space:pre-wrap;word-break:break-word}
.ph-line[data-kind=add]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent)}
.ph-line[data-kind=del]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent)}
.ph-line[data-kind=meta]{color:var(--dsw-alias-label-tertiary);font-style:italic}
.ph-num{flex:none;width:34px;padding:0 6px;text-align:right;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;user-select:none}
.ph-sign{flex:none;width:14px;text-align:center;color:var(--dsw-alias-label-tertiary);user-select:none}
.ph-code{flex:1 1 auto;min-width:0;padding-right:10px}
.ph-split{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);min-width:0}
.ph-split .ph-side{display:flex;align-items:flex-start;min-width:0;border-right:1px solid var(--dsw-alias-border-l3);white-space:pre}
.ph-diff[data-wrap=true] .ph-split .ph-side{white-space:pre-wrap;word-break:break-word}
.ph-split .ph-side:last-child{border-right:0}
.ph-split .ph-side[data-kind=add]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent)}
.ph-split .ph-side[data-kind=del]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent)}
.ph-split .ph-side[data-empty=true]{background:var(--dsw-alias-bg-layer-1)}

/* Branch picker */
.ph-branch-pop{position:absolute;left:0;top:calc(100% + 4px);z-index:60;width:min(320px,calc(100vw - 40px));display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-2);box-shadow:0 12px 32px rgba(0,0,0,.26);overflow:hidden}
.ph-pop-search{display:flex;align-items:center;gap:6px;padding:7px 8px;border-bottom:1px solid var(--dsw-alias-border-l3)}
.ph-pop-input{flex:1 1 auto;min-width:0;border:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;outline:none}
.ph-pop-list{max-height:240px;overflow:auto;padding:4px}
.ph-ref{display:flex;align-items:center;gap:6px;width:100%;padding:5px 7px;border:0;border-radius:6px;background:transparent;cursor:pointer;text-align:left;font-size:12px;min-width:0}
.ph-ref:hover{background:var(--dsw-alias-bg-layer-1)}
.ph-ref[data-current=true]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}
.ph-ref-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph-ref-tag{flex:none;font-size:9.5px;color:var(--dsw-alias-label-tertiary);border:1px solid var(--dsw-alias-border-l3);border-radius:999px;padding:0 4px}
.ph-pop-foot{padding:6px 8px;border-top:1px solid var(--dsw-alias-border-l3);font-size:10.5px;color:var(--dsw-alias-label-tertiary)}

/* Dialog (inside the panel) */
.ph-overlay{position:absolute;inset:0;z-index:70;display:flex;align-items:flex-end;justify-content:center;padding:8px;background:rgba(0,0,0,.28)}
.ph-dialog{width:100%;max-height:92%;overflow:auto;display:flex;flex-direction:column;gap:8px;padding:12px;border:1px solid var(--dsw-alias-border-l1);border-radius:11px;background:var(--dsw-alias-bg-layer-2);box-shadow:0 18px 42px rgba(0,0,0,.32)}
.ph-dialog-title{font-size:13px;font-weight:600}
.ph-dialog-body{margin:0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.5}
.ph-dialog-actions{display:flex;align-items:center;gap:6px;justify-content:flex-end;flex-wrap:wrap}
.ph-field{display:flex;flex-direction:column;gap:4px}
.ph-field-label{font-size:11px;color:var(--dsw-alias-label-tertiary)}
.ph-input,.ph-select{width:100%;padding:5px 7px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px}
.ph-radio{display:flex;align-items:flex-start;gap:7px;padding:7px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;cursor:pointer}
.ph-radio[data-checked=true]{border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,transparent)}
.ph-radio input{margin:2px 0 0}
.ph-radio-text{display:flex;flex-direction:column;gap:1px;min-width:0}
.ph-radio-title{font-size:12px;font-weight:500}
.ph-radio-hint{font-size:11px;color:var(--dsw-alias-label-tertiary)}

/* Toasts */
.ph-toasts{position:absolute;left:8px;right:8px;bottom:8px;z-index:80;display:flex;flex-direction:column;gap:6px;pointer-events:none}
.ph-toast{pointer-events:auto;display:flex;align-items:flex-start;gap:7px;padding:8px 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-2);box-shadow:0 10px 26px rgba(0,0,0,.28);font-size:11.5px}
.ph-toast[data-tone=error]{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 45%,var(--dsw-alias-border-l1))}
.ph-toast[data-tone=success]{border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 45%,var(--dsw-alias-border-l1))}
.ph-toast-text{flex:1 1 auto;min-width:0}
.ph-toast-title{font-weight:600;margin-bottom:1px}
.ph-toast-desc{color:var(--dsw-alias-label-tertiary);line-height:1.4;word-break:break-word}

/* Lists, details, cards */
.ph-section{display:flex;align-items:center;gap:6px;padding:5px 10px;color:var(--dsw-alias-label-tertiary);font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;background:var(--dsw-alias-bg-layer-1);border-bottom:1px solid var(--dsw-alias-border-l3)}
.ph-item{display:flex;flex-direction:column;gap:2px;width:100%;padding:7px 10px;border:0;border-bottom:1px solid var(--dsw-alias-border-l3);background:transparent;cursor:pointer;text-align:left}
.ph-item:hover{background:var(--dsw-alias-bg-layer-1)}
.ph-item-title{display:flex;align-items:center;gap:5px;min-width:0;font-size:12px}
.ph-item-number{flex:none;font-family:ui-monospace,monospace;font-size:11px;color:var(--dsw-alias-label-tertiary)}
.ph-item-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.ph-item-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;color:var(--dsw-alias-label-tertiary);font-size:10.5px}
.ph-detail{display:flex;flex-direction:column;gap:8px;padding:10px}
.ph-detail-title{font-size:13px;font-weight:600;line-height:1.4}
.ph-detail-meta{display:flex;flex-direction:column;gap:3px}
.ph-detail-row{display:flex;align-items:baseline;gap:8px;font-size:11.5px}
.ph-detail-label{flex:none;width:76px;color:var(--dsw-alias-label-tertiary)}
.ph-detail-value{min-width:0;overflow:hidden;text-overflow:ellipsis}
.ph-card{display:flex;flex-direction:column;gap:6px;padding:8px 9px;border:1px solid var(--dsw-alias-border-l3);border-radius:8px;background:var(--dsw-alias-bg-layer-1)}
.ph-card-title{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.ph-prose{margin:0;font-size:11.5px;line-height:1.55;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-word}
.ph-comment{display:flex;flex-direction:column;gap:3px;padding:6px 0;border-top:1px solid var(--dsw-alias-border-l3)}
.ph-comment:first-of-type{border-top:0}
.ph-comment-head{display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-tertiary);font-size:10.5px}
.ph-comment-author{color:var(--dsw-alias-label-secondary);font-weight:600}
.ph-check{display:flex;align-items:center;gap:6px;padding:2px 0;font-size:11.5px;min-width:0}
.ph-check-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph-check-duration{flex:none;color:var(--dsw-alias-label-tertiary);font-size:10.5px}
.ph-filters{display:flex;align-items:center;gap:4px;padding:6px 10px;flex-wrap:wrap;border-bottom:1px solid var(--dsw-alias-border-l3)}
.ph-filter{padding:2px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:11px}
.ph-filter[aria-pressed=true]{border-color:transparent;background:var(--dsw-alias-brand-primary);color:#fff}

/* Empty, loading, failure */
.ph-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:28px 18px;text-align:center;color:var(--dsw-alias-label-tertiary)}
.ph-empty-icon{display:flex;color:var(--dsw-alias-label-tertiary);opacity:.8}
.ph-empty-title{font-size:12.5px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.ph-empty-hint{font-size:11.5px;line-height:1.5;max-width:260px}
.ph-error{display:flex;flex-direction:column;align-items:flex-start;gap:5px;margin:8px 10px;padding:9px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 40%,var(--dsw-alias-border-l1));border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 7%,var(--dsw-alias-bg-layer-1));font-size:11.5px;line-height:1.45}
.ph-error-title{display:flex;align-items:center;gap:5px;font-weight:600;color:var(--dsw-alias-state-error-primary)}
.ph-error-code{font-family:ui-monospace,monospace;font-size:10.5px;color:var(--dsw-alias-label-tertiary)}
.ph-loading{display:flex;align-items:center;gap:7px;padding:12px;color:var(--dsw-alias-label-tertiary);font-size:11.5px}

/* Settings card (plugin row) */
.ph-wrap{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap}
.ph-setting{display:flex;flex-direction:column;gap:7px;padding:9px 0}
.ph-setting-head{font-size:12.5px;font-weight:500}
.ph-check-row{display:flex;align-items:center;gap:7px;font-size:12px}
.ph-check-row input{flex:none;margin:0}
.ph-check-row input:disabled+span{opacity:.6}
.ph-ok{margin:0;color:var(--dsw-alias-state-success-primary);font-size:12px}

/* Web Remote card (plugin row) */
.ph-dot[data-state=warn]{background:var(--dsw-alias-state-warn-primary)}
.ph-dot[data-state=idle]{background:var(--dsw-alias-label-tertiary)}
a.ph-button{text-decoration:none;color:var(--dsw-alias-label-secondary)}
.ph-pair{display:flex;flex-direction:column;gap:6px;padding:9px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 35%,var(--dsw-alias-border-l1));border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 6%,var(--dsw-alias-bg-layer-1))}
.ph-pair[data-expired=true]{border-color:var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.ph-pair-code-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ph-pair-code{flex:1 1 auto;min-width:0;padding:6px 10px;border:1px dashed var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:17px;font-weight:600;letter-spacing:.14em;text-align:center;user-select:all}
.ph-pair[data-expired=true] .ph-pair-code{color:var(--dsw-alias-label-tertiary);text-decoration:line-through}
.ph-fingerprint{font-size:10.5px;word-break:break-all}
.ph-tooltip{position:relative}
`
