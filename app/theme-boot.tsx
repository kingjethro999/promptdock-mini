const THEME_BOOT = `(function(){try{var t=localStorage.getItem("pmd.theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;

export function ThemeBoot() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />;
}
