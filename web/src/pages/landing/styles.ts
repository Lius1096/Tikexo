export const LANDING_CSS = `
  .lp{font-family:'Inter',sans-serif;background:#fff;color:#1E293B;overflow-x:hidden;}

  /* ── NAV ───────────────────────────────────────────────────── */
  .nav{
    background:rgba(26,60,94,0.97);
    backdrop-filter:blur(12px);
    display:flex;align-items:center;justify-content:space-between;
    padding:0 40px;height:60px;
    position:sticky;top:0;z-index:100;
    border-bottom:0.5px solid rgba(255,255,255,0.06);
  }
  .nav-brand{display:flex;align-items:center;gap:10px;}
  .nav-logo{font-size:19px;font-weight:700;color:#fff;letter-spacing:2.5px;}
  .nav-badge{font-size:9px;background:#0EA5E9;color:#fff;padding:2px 8px;border-radius:10px;letter-spacing:1px;font-weight:600;}
  .nav-links{display:flex;gap:28px;}
  .nav-link{font-size:13px;color:rgba(255,255,255,0.5);cursor:pointer;letter-spacing:0.2px;transition:color .2s;}
  .nav-link:hover{color:rgba(255,255,255,0.9);}
  .nav-right{display:flex;align-items:center;gap:12px;}
  .nav-login{font-size:12px;color:rgba(255,255,255,0.5);cursor:pointer;letter-spacing:0.2px;}
  .nav-cta{background:#0EA5E9;color:#fff;font-size:13px;font-weight:500;padding:9px 20px;border-radius:22px;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:opacity .2s;}
  .nav-cta:hover{opacity:.88;}

  .nav-dropdown{
    position:absolute;top:calc(100% + 12px);right:0;
    background:#fff;border-radius:14px;
    border:1px solid #E2E8F0;
    box-shadow:0 16px 48px rgba(0,0,0,0.14);
    padding:8px;min-width:220px;z-index:200;
    animation:dropdownIn .15s ease;
  }
  @keyframes dropdownIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
  .nav-dropdown-item{
    display:flex;align-items:center;gap:12px;
    width:100%;padding:10px 12px;border-radius:10px;
    background:transparent;border:none;cursor:pointer;
    text-align:left;transition:background .15s;font-family:'Inter',sans-serif;
  }
  .nav-dropdown-item:hover{background:#F8FAFC;}
  .nav-dropdown-icon{
    width:34px;height:34px;border-radius:10px;
    background:#EFF6FF;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;
  }
  .nav-dropdown-label{font-size:13px;font-weight:600;color:#0F172A;}
  .nav-dropdown-sub{font-size:11px;color:#94A3B8;margin-top:1px;}

  /* ── HERO SLIDER ─────────────────────────────────────────────── */
  .hero-slider{
    position:relative;width:100%;
    height:88vh;min-height:500px;
    overflow:hidden;background:#0f2a42;
  }
  .hs-track{
    display:flex;height:100%;
    transition:transform 0.5s ease;
    will-change:transform;
  }
  .hs-slide{
    flex:0 0 100%;position:relative;overflow:hidden;
  }
  .hs-bg{
    position:absolute;inset:0;
    width:100%;height:100%;
    object-fit:cover;object-position:center top;
  }
  .hs-dim{
    position:absolute;inset:0;
    background:linear-gradient(90deg,rgba(0,0,0,0.25) 0%,transparent 65%);
  }
  .hs-content-wrap{
    position:absolute;inset:0;
    display:flex;align-items:center;
    padding:0 72px;
  }
  .hs-panel{
    max-width:420px;
    padding:36px 40px;
    border-radius:20px;
    box-shadow:0 20px 60px rgba(0,0,0,0.18);
  }
  .hs-eyebrow{
    display:block;font-size:10px;font-weight:700;
    letter-spacing:3px;margin-bottom:14px;
  }
  .hs-title{
    font-size:34px;font-weight:700;line-height:1.15;
    margin-bottom:14px;white-space:pre-line;
  }
  .hs-desc{
    font-size:14px;line-height:1.7;
    margin-bottom:24px;opacity:0.8;
  }
  .hs-cta{
    display:inline-flex;align-items:center;gap:8px;
    padding:13px 26px;border-radius:28px;
    font-size:14px;font-weight:600;
    border:none;cursor:pointer;
    font-family:'Inter',sans-serif;
    transition:opacity .2s,transform .2s;
  }
  .hs-cta:hover{opacity:.88;transform:translateY(-1px);}

  /* Arrows */
  .hs-arrow{
    position:absolute;top:50%;transform:translateY(-50%);
    width:48px;height:48px;border-radius:50%;
    background:rgba(255,255,255,0.12);
    border:1.5px solid rgba(255,255,255,0.2);
    color:#fff;font-size:18px;
    cursor:pointer;display:flex;align-items:center;justify-content:center;
    transition:background .2s;z-index:10;
  }
  .hs-arrow:hover{background:rgba(255,255,255,0.25);}
  .hs-prev{left:20px;}
  .hs-next{right:20px;}

  /* Dots */
  .hs-dots{
    position:absolute;bottom:22px;left:50%;transform:translateX(-50%);
    display:flex;gap:8px;z-index:10;
  }
  .hs-dot{
    width:8px;height:8px;border-radius:4px;
    background:rgba(255,255,255,0.35);
    border:none;cursor:pointer;
    transition:all .35s ease;padding:0;
  }
  .hs-dot-active{width:28px;background:#fff;}

  /* Play/Pause */
  .hs-playpause{
    position:absolute;bottom:16px;right:20px;
    width:32px;height:32px;border-radius:50%;
    background:rgba(255,255,255,0.12);
    border:1px solid rgba(255,255,255,0.2);
    color:#fff;cursor:pointer;
    display:flex;align-items:center;justify-content:center;
    z-index:10;font-size:11px;transition:background .2s;
  }
  .hs-playpause:hover{background:rgba(255,255,255,0.22);}

  /* ── SOCIAL PROOF BAND ───────────────────────────────────────── */
  .proof-band{
    background:#fff;border-bottom:1px solid #F1F5F9;
    padding:28px 44px;
    display:flex;align-items:center;justify-content:space-between;
  }
  .proof-stats{display:flex;align-items:center;gap:40px;}
  .proof-stat{}
  .proof-stat-val{font-family:'JetBrains Mono',monospace;font-size:24px;font-weight:500;color:#1A3C5E;line-height:1;}
  .proof-stat-label{font-size:10px;color:#94A3B8;margin-top:3px;letter-spacing:0.3px;}
  .proof-sep{width:1px;height:36px;background:#E2E8F0;}
  .proof-ops{display:flex;align-items:center;gap:6px;}
  .proof-ops-label{font-size:10px;color:#94A3B8;margin-right:8px;letter-spacing:0.5px;white-space:nowrap;}
  .proof-op-chip{
    background:#F8FAFC;border:1px solid #E2E8F0;
    border-radius:20px;padding:5px 12px;
    font-size:11px;font-weight:500;color:#475569;
    display:flex;align-items:center;gap:5px;
  }
  .proof-op-dot{width:6px;height:6px;border-radius:50%;}

  /* ── COMMON SECTION ──────────────────────────────────────────── */
  .section{padding:80px 44px;}
  .section-center{text-align:center;}
  .section-header{margin-bottom:48px;}
  .section-header.center{text-align:center;}
  .section-header.center .section-sub{margin:0 auto;}
  .section-eyebrow{font-size:10px;color:#0EA5E9;letter-spacing:3px;font-weight:600;margin-bottom:8px;}
  .section-title{font-size:34px;font-weight:300;color:#1E293B;line-height:1.2;}
  .section-title strong{font-weight:700;color:#1A3C5E;}
  .section-sub{font-size:15px;color:#64748B;line-height:1.75;margin-top:10px;max-width:520px;}

  /* ── HOW IT WORKS ────────────────────────────────────────────── */
  .how-works{background:#1A3C5E;padding:80px 44px;}
  .how-title{font-size:34px;font-weight:300;color:#fff;margin-bottom:8px;line-height:1.2;}
  .how-title strong{font-weight:700;color:#0EA5E9;}
  .how-sub{font-size:15px;color:rgba(255,255,255,0.4);margin-bottom:48px;line-height:1.7;}
  .how-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
  .how-card{
    background:rgba(255,255,255,0.04);
    border:0.5px solid rgba(255,255,255,0.09);
    border-radius:20px;padding:28px 24px;
    transition:border-color .2s;
  }
  .how-card:hover{border-color:rgba(14,165,233,0.3);}
  .how-num{
    font-family:'JetBrains Mono',monospace;font-size:40px;font-weight:500;
    color:rgba(14,165,233,0.2);margin-bottom:18px;line-height:1;
  }
  .how-icon{
    width:44px;height:44px;border-radius:12px;
    background:rgba(14,165,233,0.12);
    display:flex;align-items:center;justify-content:center;
    margin-bottom:16px;
  }
  .how-card-title{font-size:15px;font-weight:600;color:#fff;margin-bottom:8px;}
  .how-card-desc{font-size:13px;color:rgba(255,255,255,0.4);line-height:1.7;}
  .how-highlight{background:linear-gradient(135deg,#0EA5E9,#0b82bf);border-color:#0EA5E9;}
  .how-highlight .how-num{color:rgba(255,255,255,0.3);}
  .how-highlight .how-icon{background:rgba(255,255,255,0.15);}
  .how-highlight .how-card-desc{color:rgba(255,255,255,0.8);}
  .how-tag{
    font-size:10px;background:rgba(255,255,255,0.12);color:rgba(255,255,255,0.7);
    padding:4px 10px;border-radius:10px;display:inline-block;margin-top:14px;
    letter-spacing:0.3px;
  }
  .how-highlight .how-tag{background:rgba(255,255,255,0.2);}

  /* ── PERSONA SECTIONS ────────────────────────────────────────── */
  .persona-section{padding:80px 44px;}
  .persona-section.alt{background:#F8FAFC;}
  .persona-grid{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center;}
  .persona-grid.reverse{direction:rtl;}
  .persona-grid.reverse > *{direction:ltr;}
  .persona-eyebrow{
    display:inline-flex;align-items:center;gap:8px;
    background:#EFF6FF;border:1px solid #DBEAFE;
    border-radius:20px;padding:5px 14px;
    font-size:11px;font-weight:600;color:#1D4ED8;
    margin-bottom:20px;letter-spacing:0.3px;
  }
  .persona-eyebrow.green{background:#F0FDF4;border-color:#DCFCE7;color:#166534;}
  .persona-eyebrow.amber{background:#FFFBEB;border-color:#FEF3C7;color:#92400E;}
  .persona-title{font-size:32px;font-weight:300;color:#1E293B;line-height:1.2;margin-bottom:14px;}
  .persona-title strong{font-weight:700;color:#1A3C5E;}
  .persona-sub{font-size:14px;color:#64748B;line-height:1.75;margin-bottom:28px;}
  .persona-feats{display:flex;flex-direction:column;gap:10px;margin-bottom:28px;}
  .persona-feat{display:flex;align-items:flex-start;gap:10px;}
  .persona-feat-icon{
    width:22px;height:22px;border-radius:6px;
    background:#EFF6FF;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;
  }
  .persona-feat-icon.green{background:#F0FDF4;}
  .persona-feat-icon.amber{background:#FFFBEB;}
  .persona-feat-text{font-size:13px;color:#475569;line-height:1.55;}
  .persona-feat-title{font-size:13px;font-weight:600;color:#1E293B;margin-bottom:2px;}
  .persona-cta{
    display:inline-flex;align-items:center;gap:8px;
    background:#1A3C5E;color:#fff;font-size:13px;font-weight:500;
    padding:12px 24px;border-radius:22px;cursor:pointer;border:none;
    font-family:'Inter',sans-serif;transition:all .2s;
  }
  .persona-cta:hover{background:#0f2a42;transform:translateY(-1px);}
  .persona-cta.outline{
    background:transparent;color:#1A3C5E;
    border:1.5px solid #E2E8F0;
  }
  .persona-cta.outline:hover{background:#F8FAFC;}

  .persona-img-wrap{
    border-radius:20px;overflow:hidden;
    position:relative;
    box-shadow:0 24px 60px rgba(0,0,0,0.12);
    aspect-ratio:4/3;
  }
  .persona-img{width:100%;height:100%;object-fit:cover;}
  .persona-img-badge{
    position:absolute;bottom:16px;left:16px;
    background:rgba(26,60,94,0.92);
    backdrop-filter:blur(10px);
    border:0.5px solid rgba(255,255,255,0.1);
    border-radius:12px;padding:10px 14px;
    display:flex;align-items:center;gap:8px;
  }
  .persona-img-badge-dot{width:8px;height:8px;border-radius:50%;background:#34d399;flex-shrink:0;}
  .persona-img-badge-text{font-size:11px;color:rgba(255,255,255,0.85);font-weight:500;}

  /* UI mockup card for employee phone */
  .phone-mockup{
    background:linear-gradient(145deg,#1A3C5E,#0f2a42);
    border-radius:20px;padding:20px;
    box-shadow:0 24px 60px rgba(26,60,94,0.3);
    position:relative;overflow:hidden;
  }
  .phone-mockup::before{
    content:'';position:absolute;top:-40px;right:-40px;
    width:150px;height:150px;border-radius:50%;
    background:rgba(14,165,233,0.07);
  }
  .pm-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
  .pm-title{font-size:12px;color:rgba(255,255,255,0.45);letter-spacing:1px;}
  .pm-badge{font-size:9px;background:#0EA5E9;color:#fff;padding:2px 8px;border-radius:8px;}
  .pm-balance{margin-bottom:20px;}
  .pm-balance-label{font-size:10px;color:rgba(255,255,255,0.3);letter-spacing:1.5px;margin-bottom:6px;}
  .pm-balance-amount{font-family:'JetBrains Mono',monospace;font-size:32px;font-weight:500;color:#fff;line-height:1;}
  .pm-balance-xof{font-size:14px;color:rgba(255,255,255,0.35);margin-left:6px;}
  .pm-progress{height:3px;background:rgba(255,255,255,0.06);border-radius:2px;margin-bottom:20px;overflow:hidden;}
  .pm-progress-fill{height:100%;width:71%;background:linear-gradient(90deg,#0EA5E9,#38bdf8);border-radius:2px;}
  .pm-txs{display:flex;flex-direction:column;gap:6px;}
  .pm-tx{display:flex;align-items:center;gap:9px;padding:8px 10px;background:rgba(255,255,255,0.04);border-radius:8px;}
  .pm-tx-ico{width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .pm-tx-name{font-size:11px;font-weight:500;color:rgba(255,255,255,0.75);flex:1;}
  .pm-tx-sub{font-size:9px;color:rgba(255,255,255,0.25);}
  .pm-tx-amt{font-family:'JetBrains Mono',monospace;font-size:11px;flex-shrink:0;}
  .pm-tx-amt.c{color:#34d399;}
  .pm-tx-amt.d{color:rgba(255,255,255,0.4);}
  .pm-qr-btn{
    width:100%;margin-top:14px;
    background:#0EA5E9;color:#fff;
    font-size:12px;font-weight:600;
    padding:11px;border-radius:10px;
    display:flex;align-items:center;justify-content:center;gap:7px;
    cursor:pointer;border:none;font-family:'Inter',sans-serif;
  }

  /* Employer dashboard mockup */
  .dash-mockup{
    background:#fff;border-radius:20px;
    box-shadow:0 24px 60px rgba(0,0,0,0.1);
    overflow:hidden;border:1px solid #E2E8F0;
  }
  .dm-topbar{background:#1A3C5E;padding:12px 16px;display:flex;align-items:center;gap:8px;}
  .dm-dot{width:10px;height:10px;border-radius:50%;}
  .dm-topbar-title{font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:1px;margin-left:6px;}
  .dm-body{padding:16px;}
  .dm-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;}
  .dm-kpi{background:#F8FAFC;border-radius:10px;padding:10px 12px;border:1px solid #F1F5F9;}
  .dm-kpi-val{font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:500;color:#1A3C5E;}
  .dm-kpi-label{font-size:9px;color:#94A3B8;margin-top:2px;letter-spacing:0.3px;}
  .dm-table-head{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;padding:6px 10px;margin-bottom:4px;}
  .dm-table-head span{font-size:9px;color:#94A3B8;letter-spacing:0.5px;}
  .dm-row{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;padding:8px 10px;background:#F8FAFC;border-radius:8px;margin-bottom:4px;align-items:center;}
  .dm-row-name{font-size:11px;font-weight:500;color:#1E293B;}
  .dm-row-amt{font-family:'JetBrains Mono',monospace;font-size:11px;color:#1A3C5E;}
  .dm-row-badge{font-size:9px;padding:2px 7px;border-radius:6px;}
  .dm-row-badge.valide{background:#EAF3DE;color:#3B6D11;}
  .dm-row-badge.attente{background:#FAEEDA;color:#854F0B;}

  /* ── TESTIMONIALS ────────────────────────────────────────────── */
  .testimonials-section{background:#F8FAFC;padding:80px 44px;}
  .testimonials-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
  .testi-card{
    background:#fff;border-radius:20px;padding:28px;
    border:1px solid #F1F5F9;
    box-shadow:0 4px 24px rgba(0,0,0,0.04);
    display:flex;flex-direction:column;gap:16px;
  }
  .testi-stars{display:flex;gap:3px;}
  .testi-star{color:#F59E0B;font-size:14px;}
  .testi-quote{
    font-size:14px;color:#334155;line-height:1.75;
    font-style:italic;flex:1;
  }
  .testi-quote::before{content:'"';color:#0EA5E9;font-size:22px;line-height:0;vertical-align:-5px;margin-right:2px;}
  .testi-author{display:flex;align-items:center;gap:12px;padding-top:16px;border-top:1px solid #F1F5F9;}
  .testi-avatar{width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0;}
  .testi-name{font-size:13px;font-weight:600;color:#1E293B;}
  .testi-role{font-size:11px;color:#94A3B8;margin-top:1px;}

  /* ── ACTORS ──────────────────────────────────────────────────── */
  .actors-section{padding:80px 44px;}
  .actors-section .section-header{text-align:center;}
  .actors-section .section-sub{margin:0 auto;}
  .actors-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;align-items:start;}

  .actor-card{
    background:#fff;border-radius:24px;overflow:hidden;
    border:1px solid #F1F5F9;
    box-shadow:0 2px 16px rgba(0,0,0,0.05);
    transition:transform .28s cubic-bezier(.22,.68,0,1.2),box-shadow .28s;
    display:flex;flex-direction:column;
  }
  .actor-card:hover{transform:translateY(-8px);box-shadow:0 24px 56px rgba(0,0,0,0.11);}

  .actor-accent{height:4px;width:100%;flex-shrink:0;}

  .actor-img-wrap{position:relative;overflow:hidden;height:210px;flex-shrink:0;}
  .actor-card-img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .45s ease;}
  .actor-card:hover .actor-card-img{transform:scale(1.05);}
  .actor-img-gradient{
    position:absolute;inset:0;
    background:linear-gradient(to bottom,transparent 45%,rgba(255,255,255,0.95) 100%);
    pointer-events:none;
  }
  .actor-img-tag{
    position:absolute;top:12px;right:12px;
    display:inline-flex;align-items:center;gap:5px;
    font-size:10px;font-weight:600;letter-spacing:0.3px;
    padding:5px 11px;border-radius:20px;
    backdrop-filter:blur(8px);
    border:1px solid rgba(255,255,255,0.4);
  }

  .actor-card-header{padding:12px 20px 0;display:flex;align-items:center;gap:12px;}
  .actor-avatar{
    width:44px;height:44px;border-radius:14px;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 4px 14px rgba(0,0,0,0.18);
  }
  .actor-name{font-size:15px;font-weight:700;color:#0F172A;line-height:1.2;}
  .actor-role{font-size:11px;color:#94A3B8;margin-top:2px;letter-spacing:0.2px;}

  .actor-features{list-style:none;padding:16px 20px 24px;display:flex;flex-direction:column;gap:0;margin:0;}
  .actor-feat{display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid #F8FAFC;}
  .actor-feat:last-child{border-bottom:none;}
  .actor-feat-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:6px;}
  .actor-feat-text{font-size:12.5px;color:#475569;line-height:1.55;}

  .actor-card-footer{padding:0 20px 20px;}
  .actor-login-btn{
    width:100%;padding:10px;border-radius:10px;
    background:transparent;border:1.5px solid;
    font-size:12.5px;font-weight:600;cursor:pointer;
    font-family:'Inter',sans-serif;
    display:flex;align-items:center;justify-content:center;gap:7px;
    transition:background .18s,color .18s;
  }
  .actor-login-btn:hover{background:rgba(0,0,0,0.04);}

  /* ── WALLET SECTION ──────────────────────────────────────────── */
  .wallet-section{background:#F8FAFC;border-top:1px solid #E2E8F0;border-bottom:1px solid #E2E8F0;padding:80px 44px;}
  .wallet-grid{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center;}
  .wallet-right{background:#1A3C5E;border-radius:20px;padding:28px;overflow:hidden;position:relative;}
  .wallet-right::before{
    content:'';position:absolute;top:-30px;right:-30px;
    width:120px;height:120px;border-radius:50%;
    background:rgba(14,165,233,0.06);
  }
  .wallet-example-title{font-size:10px;color:rgba(255,255,255,0.25);letter-spacing:2px;margin-bottom:18px;}
  .wallet-ex-row{display:flex;align-items:center;padding:10px 0;border-bottom:0.5px solid rgba(255,255,255,0.06);}
  .wallet-ex-row:last-child{border-bottom:none;}
  .wallet-ex-icon{width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-right:12px;}
  .wallet-ex-label{font-size:12px;color:rgba(255,255,255,0.55);flex:1;}
  .wallet-ex-tag{font-size:9px;padding:3px 9px;border-radius:8px;flex-shrink:0;font-weight:500;}
  .wallet-ex-tag.free{background:rgba(14,165,233,0.18);color:#38bdf8;}
  .wallet-ex-tag.paid{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.3);}

  /* ── PRICING ─────────────────────────────────────────────────── */
  .pricing-section{padding:80px 44px;}
  .pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
  .pricing-card{
    background:#fff;border:1px solid #E2E8F0;
    border-radius:20px;padding:28px 24px;
    transition:transform .2s;
  }
  .pricing-card:hover{transform:translateY(-4px);}
  .pricing-card.featured{background:#1A3C5E;border-color:#1A3C5E;}
  .pricing-name{font-size:13px;font-weight:600;letter-spacing:0.5px;margin-bottom:10px;}
  .pricing-card:not(.featured) .pricing-name{color:#64748B;}
  .pricing-card.featured .pricing-name{color:rgba(255,255,255,0.5);}
  .pricing-price{font-family:'JetBrains Mono',monospace;font-size:26px;font-weight:500;line-height:1;margin-bottom:4px;}
  .pricing-card:not(.featured) .pricing-price{color:#1A3C5E;}
  .pricing-card.featured .pricing-price{color:#38bdf8;}
  .pricing-period{font-size:11px;color:#94A3B8;margin-bottom:22px;}
  .pricing-card.featured .pricing-period{color:rgba(255,255,255,0.3);}
  .pricing-divider{height:0.5px;background:#F1F5F9;margin-bottom:16px;}
  .pricing-card.featured .pricing-divider{background:rgba(255,255,255,0.08);}
  .pricing-feat{display:flex;align-items:flex-start;gap:8px;margin-bottom:9px;}
  .pricing-feat-text{font-size:12px;line-height:1.5;}
  .pricing-card:not(.featured) .pricing-feat-text{color:#475569;}
  .pricing-card.featured .pricing-feat-text{color:rgba(255,255,255,0.65);}
  .pricing-cta{
    width:100%;padding:12px;border-radius:12px;
    font-size:13px;font-weight:600;cursor:pointer;margin-top:18px;
    font-family:'Inter',sans-serif;border:none;transition:all .2s;
  }
  .pricing-card:not(.featured) .pricing-cta{background:#F1F5F9;color:#1A3C5E;}
  .pricing-card:not(.featured) .pricing-cta:hover{background:#E2E8F0;}
  .pricing-card.featured .pricing-cta{background:#0EA5E9;color:#fff;}
  .pricing-card.featured .pricing-cta:hover{background:#0b8fc6;}
  .pricing-badge{
    font-size:9px;background:#0EA5E9;color:#fff;
    padding:3px 10px;border-radius:10px;
    display:inline-block;margin-bottom:12px;font-weight:600;letter-spacing:0.3px;
  }

  /* ── BENIN ───────────────────────────────────────────────────── */
  .benin-section{background:#1A3C5E;padding:80px 44px;}
  .benin-grid{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center;}
  .benin-eyebrow{font-size:10px;color:#0EA5E9;letter-spacing:3px;font-weight:600;margin-bottom:12px;}
  .benin-title{font-size:34px;font-weight:300;color:#fff;line-height:1.2;margin-bottom:16px;}
  .benin-title strong{font-weight:700;}
  .benin-sub{font-size:14px;color:rgba(255,255,255,0.45);line-height:1.75;margin-bottom:28px;}
  .benin-ops{display:flex;gap:8px;flex-wrap:wrap;}
  .benin-op{
    display:flex;align-items:center;gap:6px;
    background:rgba(255,255,255,0.06);
    border:0.5px solid rgba(255,255,255,0.1);
    border-radius:22px;padding:7px 14px;
    transition:background .2s;
  }
  .benin-op:hover{background:rgba(255,255,255,0.1);}
  .benin-op-dot{width:7px;height:7px;border-radius:50%;}
  .benin-op-name{font-size:12px;color:rgba(255,255,255,0.8);font-weight:500;}
  .benin-right{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
  .benin-stat-card{
    background:rgba(255,255,255,0.04);
    border:0.5px solid rgba(255,255,255,0.08);
    border-radius:16px;padding:18px 16px;
    transition:background .2s;
  }
  .benin-stat-card:hover{background:rgba(255,255,255,0.06);}
  .benin-stat-icon{
    width:36px;height:36px;background:rgba(14,165,233,0.15);
    border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:12px;
  }
  .benin-stat-val{font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:500;color:#fff;margin-bottom:4px;}
  .benin-stat-label{font-size:11px;color:rgba(255,255,255,0.35);line-height:1.4;}

  /* ── CTA ─────────────────────────────────────────────────────── */
  .cta-section{
    padding:96px 44px;text-align:center;
    background:linear-gradient(145deg,#0f2a42,#1A3C5E);
    position:relative;overflow:hidden;
  }
  .cta-section::before{
    content:'';position:absolute;top:-100px;left:50%;transform:translateX(-50%);
    width:500px;height:500px;border-radius:50%;
    background:rgba(14,165,233,0.08);
  }
  .cta-eyebrow{font-size:10px;color:#0EA5E9;letter-spacing:3px;font-weight:600;margin-bottom:12px;position:relative;}
  .cta-title{font-size:38px;font-weight:300;color:#fff;margin-bottom:12px;line-height:1.15;position:relative;}
  .cta-title strong{font-weight:700;}
  .cta-sub{font-size:15px;color:rgba(255,255,255,0.45);margin-bottom:36px;line-height:1.75;position:relative;}
  .cta-btns{display:flex;gap:12px;justify-content:center;position:relative;}
  .cta-btn-main{
    background:#0EA5E9;color:#fff;font-size:14px;font-weight:600;
    padding:15px 32px;border-radius:30px;cursor:pointer;border:none;
    font-family:'Inter',sans-serif;transition:all .2s;
    box-shadow:0 8px 24px rgba(14,165,233,0.35);
  }
  .cta-btn-main:hover{background:#0b8fc6;transform:translateY(-2px);}
  .cta-btn-ghost{
    background:transparent;color:rgba(255,255,255,0.6);font-size:13px;
    padding:15px 26px;border-radius:30px;cursor:pointer;
    border:1px solid rgba(255,255,255,0.15);font-family:'Inter',sans-serif;
    transition:all .2s;
  }
  .cta-btn-ghost:hover{color:#fff;border-color:rgba(255,255,255,0.35);}

  /* ── FOOTER ──────────────────────────────────────────────────── */
  .footer{background:#0a1f30;padding:28px 44px;display:flex;align-items:center;justify-content:space-between;}
  .footer-logo{font-size:15px;font-weight:700;color:#0EA5E9;letter-spacing:2.5px;}
  .footer-sub{font-size:9px;color:rgba(255,255,255,0.2);letter-spacing:1.5px;margin-top:3px;}
  .footer-links{display:flex;gap:20px;}
  .footer-link{font-size:11px;color:rgba(255,255,255,0.25);cursor:pointer;transition:color .2s;}
  .footer-link:hover{color:rgba(255,255,255,0.55);}
  .footer-copy{font-size:10px;color:rgba(255,255,255,0.2);}

  /* ── RESPONSIVE TABLETTE (≤ 1024px) ─────────────────────────── */
  @media(max-width:1024px){
    .how-grid{grid-template-columns:repeat(2,1fr);}
    .testimonials-grid{grid-template-columns:repeat(2,1fr);}
    .actors-grid{grid-template-columns:repeat(2,1fr);}
    .pricing-grid{grid-template-columns:repeat(2,1fr);}
    .persona-grid{gap:36px;}
    .hs-panel{max-width:360px;}
  }

  /* ── RESPONSIVE MOBILE (≤ 768px) ────────────────────────────── */
  @media(max-width:768px){
    /* Nav */
    .nav{padding:0 16px;}
    .nav-links{display:none;}
    .nav-cta{font-size:11px;padding:8px 14px;}
    .nav-badge{display:none;}

    /* Hero */
    .hero-slider{height:70vh;min-height:420px;}
    .hs-content-wrap{padding:16px;align-items:flex-end;padding-bottom:64px;}
    .hs-panel{max-width:100%;padding:20px 18px;border-radius:16px;}
    .hs-title{font-size:22px;}
    .hs-desc{font-size:13px;margin-bottom:18px;}
    .hs-eyebrow{margin-bottom:10px;}
    .hs-arrow{width:36px;height:36px;}
    .hs-prev{left:10px;}
    .hs-next{right:10px;}

    /* Social proof */
    .proof-band{flex-direction:column;gap:20px;padding:20px 16px;align-items:flex-start;}
    .proof-stats{flex-wrap:wrap;gap:16px;}
    .proof-sep{display:none;}
    .proof-ops{flex-wrap:wrap;}

    /* Sections communes */
    .section{padding:48px 16px;}
    .section-title{font-size:24px;}
    .section-sub{font-size:14px;}

    /* How it works */
    .how-works{padding:48px 16px;}
    .how-title{font-size:24px;}
    .how-grid{grid-template-columns:1fr;}

    /* Persona */
    .persona-section{padding:48px 16px;}
    .persona-grid{grid-template-columns:1fr;gap:28px;}
    .persona-grid.reverse{direction:ltr;}
    .persona-title{font-size:24px;}

    /* Testimonials */
    .testimonials-section{padding:48px 16px;}
    .testimonials-grid{grid-template-columns:1fr;}

    /* Actors */
    .actors-section{padding:48px 16px;}
    .actors-grid{grid-template-columns:1fr;}

    /* Wallet */
    .wallet-section{padding:48px 16px;}
    .wallet-grid{grid-template-columns:1fr;gap:28px;}

    /* Pricing */
    .pricing-section{padding:48px 16px;}
    .pricing-grid{grid-template-columns:1fr;}

    /* Bénin */
    .benin-section{padding:48px 16px;}
    .benin-grid{grid-template-columns:1fr;gap:28px;}
    .benin-title{font-size:24px;}
    .benin-right{grid-template-columns:1fr 1fr;}

    /* CTA */
    .cta-section{padding:64px 16px;}
    .cta-title{font-size:26px;}
    .cta-btns{flex-direction:column;align-items:center;}
    .cta-btn-main,.cta-btn-ghost{width:100%;max-width:280px;text-align:center;}

    /* Footer */
    .footer{flex-direction:column;gap:16px;text-align:center;padding:24px 16px;}
    .footer-links{flex-wrap:wrap;justify-content:center;}
  }
`;
