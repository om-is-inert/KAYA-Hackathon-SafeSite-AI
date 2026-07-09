import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import './SideMenu.css';

gsap.registerPlugin(useGSAP);

const SideMenu = ({ isOpen, closeMenu }) => {
  const containerRef = useRef();
  const layer1Ref = useRef();
  const layer2Ref = useRef();
  const panelRef = useRef();
  const menuTextsRef = useRef([]);

  // Setup the animation hook tied to the `isOpen` prop
  useGSAP(() => {
    if (isOpen) {
      // Enable pointer events when open
      gsap.set(containerRef.current, { pointerEvents: 'auto' });

      const tl = gsap.timeline();

      // Underlays slide in from left (x: 0%)
      tl.to([layer1Ref.current, layer2Ref.current], {
        x: "0%",
        duration: 0.5,
        ease: "power4.out",
        stagger: 0.07
      }, 0);

      // White panel slides in
      tl.to(panelRef.current, {
        x: "0%",
        duration: 0.65,
        ease: "power4.out"
      }, 0.1);

      // Menu Labels stagger animation
      tl.fromTo(menuTextsRef.current,
        { yPercent: 140, rotation: 10 },
        { yPercent: 0, rotation: 0, duration: 1, ease: "power4.out", stagger: 0.1 },
        0.2
      );

    } else {
      // Disable pointer events when closed
      gsap.set(containerRef.current, { pointerEvents: 'none' });

      const tl = gsap.timeline();

      // All layers slide back left simultaneously
      tl.to([layer1Ref.current, layer2Ref.current, panelRef.current], {
        x: "-100%", // changed from 100% to -100% so they exit to the left
        duration: 0.32,
        ease: "power3.in"
      }, 0);
    }
  }, { dependencies: [isOpen], scope: containerRef });

  const handleOverlayClick = (e) => {
    if (e.target === containerRef.current || e.target === layer1Ref.current || e.target === layer2Ref.current) {
      closeMenu();
    }
  };

  const navLinks = [
    { name: "Overview", num: "01", path: "/" },
    { name: "Compliance Engine", num: "02", path: "/compliance-engine" },
    { name: "Vision Engine", num: "03", path: "#" },
    { name: "Foresight Engine", num: "04", path: "#" },
    { name: "Team", num: "05", path: "#" },
  ];

  return (
    <div ref={containerRef} className="mobile-menu" onClick={handleOverlayClick}>
      <div ref={layer1Ref} className="menu-underlay layer-1"></div>
      <div ref={layer2Ref} className="menu-underlay layer-2"></div>
      
      <div ref={panelRef} className="menu-panel">
        <button className="menu-close-btn" onClick={closeMenu}>✕</button>

        <nav className="menu-nav">
          {navLinks.map((link, index) => (
            <Link key={link.name} to={link.path} className="menu-item" onClick={() => closeMenu()}>
              <span className="menu-num">{link.num}</span>
              <div className="menu-text-wrap">
                <span 
                  className="menu-text" 
                  ref={el => menuTextsRef.current[index] = el}
                >
                  {link.name}
                </span>
              </div>
            </Link>
          ))}
        </nav>
        
        <div className="menu-footer">
          <span className="footer-label">Socials</span>
          <div className="footer-links">
            <a href="#">GitHub</a>
            <a href="#">LinkedIn</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SideMenu;
