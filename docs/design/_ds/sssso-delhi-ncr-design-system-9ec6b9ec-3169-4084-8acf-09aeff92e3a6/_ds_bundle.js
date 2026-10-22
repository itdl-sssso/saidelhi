/* @ds-bundle: {"format":4,"namespace":"SSSSODelhiNCRDesignSystem_9ec6b9","components":[{"name":"EventScheduleCard","sourcePath":"components/content/EventScheduleCard.jsx"},{"name":"QuoteCard","sourcePath":"components/content/QuoteCard.jsx"},{"name":"SevaCard","sourcePath":"components/content/SevaCard.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"DharmaRule","sourcePath":"components/core/DharmaRule.jsx"},{"name":"Eyebrow","sourcePath":"components/core/Eyebrow.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"Alert","sourcePath":"components/feedback/Alert.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"NavBar","sourcePath":"components/navigation/NavBar.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"Card","sourcePath":"components/surfaces/Card.jsx"},{"name":"ColorToken","sourcePath":"components/surfaces/ColorToken.jsx"},{"name":"SectionHeading","sourcePath":"components/surfaces/SectionHeading.jsx"}],"sourceHashes":{"components/content/EventScheduleCard.jsx":"de8bc5225122","components/content/QuoteCard.jsx":"2882e4d6da35","components/content/SevaCard.jsx":"ca612f6e57f3","components/core/Badge.jsx":"4b18f8799add","components/core/Button.jsx":"65b2cfffdf1b","components/core/DharmaRule.jsx":"e2622cc83a4e","components/core/Eyebrow.jsx":"67fb694d8c00","components/core/Icon.jsx":"37c6ad7e15e8","components/feedback/Alert.jsx":"bf58a34c9203","components/feedback/Dialog.jsx":"35872d2c73cb","components/forms/Checkbox.jsx":"9f1dacfe9654","components/forms/Input.jsx":"f5ee69c4c558","components/forms/Select.jsx":"93ffe36c32e5","components/forms/Switch.jsx":"f81501cc94f3","components/navigation/NavBar.jsx":"48882eb9d3a5","components/navigation/Tabs.jsx":"e390d326cc30","components/surfaces/Card.jsx":"16d23798d8e6","components/surfaces/ColorToken.jsx":"18ae595d2db9","components/surfaces/SectionHeading.jsx":"3bedad1bac41","ui_kits/website/Home.jsx":"9ba44ec9b7e3","ui_kits/website/data.js":"51e3728c8ebe"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.SSSSODelhiNCRDesignSystem_9ec6b9 = window.SSSSODelhiNCRDesignSystem_9ec6b9 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/DharmaRule.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function DharmaRule({
  height = 3,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "presentation",
    style: {
      height,
      width: '100%',
      background: 'var(--dharma-rule)',
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { DharmaRule });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/DharmaRule.jsx", error: String((e && e.message) || e) }); }

// components/core/Eyebrow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Eyebrow({
  children,
  color = 'var(--blue-600)',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      fontFamily: 'var(--font-sans-body)',
      fontSize: 'var(--text-eyebrow)',
      fontWeight: 'var(--weight-semibold)',
      letterSpacing: 'var(--tracking-eyebrow)',
      textTransform: 'uppercase',
      color,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 24,
      height: 1,
      background: 'currentColor',
      opacity: .5
    }
  }), children);
}
Object.assign(__ds_scope, { Eyebrow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Eyebrow.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Renders a Lucide glyph. Requires the Lucide UMD script on the page
// (https://unpkg.com/lucide@latest/dist/umd/lucide.js).
function Icon({
  name,
  size = 20,
  strokeWidth = 1.75,
  color = 'currentColor',
  style,
  ...rest
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const draw = () => {
      if (window.lucide && ref.current) window.lucide.createIcons({
        nameAttr: 'data-lucide',
        root: ref.current
      });
    };
    draw();
    if (!window.lucide) {
      const t = setInterval(() => {
        if (window.lucide) {
          draw();
          clearInterval(t);
        }
      }, 60);
      return () => clearInterval(t);
    }
  }, [name]);
  return /*#__PURE__*/React.createElement("span", _extends({
    ref: ref,
    "aria-hidden": "true",
    style: {
      display: 'inline-flex',
      width: size,
      height: size,
      color,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("i", {
    "data-lucide": name,
    style: {
      width: size,
      height: size,
      strokeWidth
    }
  }));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/content/QuoteCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function QuoteCard({
  quote,
  attribution = 'Bhagawan Sri Sathya Sai Baba',
  date,
  label = 'Thought for the Day',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("figure", _extends({
    style: {
      margin: 0,
      position: 'relative',
      background: 'var(--surface-warm)',
      border: '1px solid var(--border-warm)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-8)',
      boxShadow: 'var(--shadow-sm)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Eyebrow, {
    color: "var(--pink-700)"
  }, label), date ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans-body)',
      fontSize: 'var(--text-caption)',
      color: 'var(--pink-700)',
      opacity: .8
    }
  }, date) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 'var(--space-6)',
      right: 'var(--space-6)',
      color: 'var(--pink-300)',
      opacity: .55
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "quote",
    size: 34
  })), /*#__PURE__*/React.createElement("blockquote", {
    style: {
      margin: 'var(--space-5) 0 0',
      fontFamily: 'var(--font-serif-display)',
      fontStyle: 'italic',
      fontSize: 'var(--text-h3)',
      lineHeight: 'var(--leading-heading)',
      color: 'var(--slate-800)',
      maxWidth: 'var(--measure-quote)',
      textWrap: 'pretty'
    }
  }, quote), /*#__PURE__*/React.createElement("figcaption", {
    style: {
      marginTop: 'var(--space-5)',
      fontFamily: 'var(--font-sans-body)',
      fontSize: 'var(--text-small)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--pink-700)'
    }
  }, "\u2014 ", attribution));
}
Object.assign(__ds_scope, { QuoteCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/QuoteCard.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const tones = {
  prem: {
    background: 'var(--pink-100)',
    color: 'var(--pink-700)',
    border: '1px solid var(--pink-200)'
  },
  shanti: {
    background: 'var(--blue-100)',
    color: 'var(--blue-700)',
    border: '1px solid var(--blue-200)'
  },
  sathya: {
    background: 'var(--yellow-50)',
    color: 'var(--yellow-500)',
    border: '1px solid var(--yellow-200)'
  },
  neutral: {
    background: 'var(--slate-100)',
    color: 'var(--slate-600)',
    border: '1px solid var(--slate-200)'
  }
};
function Badge({
  children,
  tone = 'neutral',
  icon,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 12px',
      borderRadius: 'var(--radius-pill)',
      fontFamily: 'var(--font-sans-body)',
      fontSize: 'var(--text-caption)',
      fontWeight: 'var(--weight-medium)',
      lineHeight: 1.4,
      ...tones[tone],
      ...style
    }
  }, rest), icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 13
  }) : null, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/content/EventScheduleCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function EventScheduleCard({
  title = 'Upcoming Bhajans & Events',
  events = [],
  footer,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("section", _extends({
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-calm)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: 'var(--space-5) var(--space-6)',
      background: 'var(--surface-calm)',
      borderBottom: '1px solid var(--border-calm)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "calendar-days",
    size: 20,
    color: "var(--blue-700)"
  }), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-serif-display)',
      fontSize: 'var(--text-h4)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--blue-700)'
    }
  }, title)), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0
    }
  }, events.map((e, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    style: {
      display: 'flex',
      gap: 'var(--space-4)',
      alignItems: 'center',
      padding: 'var(--space-4) var(--space-6)',
      borderBottom: i === events.length - 1 ? 'none' : '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: '0 0 62px',
      textAlign: 'center',
      background: 'var(--blue-50)',
      border: '1px solid var(--border-calm)',
      borderRadius: 'var(--radius-md)',
      padding: '6px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans-body)',
      fontSize: 11,
      letterSpacing: '.12em',
      textTransform: 'uppercase',
      color: 'var(--blue-600)'
    }
  }, e.month), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-serif-display)',
      fontSize: 22,
      lineHeight: 1.1,
      color: 'var(--blue-700)'
    }
  }, e.day)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans-body)',
      fontSize: 'var(--text-body-size)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-body)'
    }
  }, e.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--space-3)',
      marginTop: 4,
      fontFamily: 'var(--font-sans-body)',
      fontSize: 'var(--text-caption)',
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "clock",
    size: 13
  }), e.time), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "map-pin",
    size: 13
  }), e.venue))), e.tag ? /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: e.tone || 'shanti'
  }, e.tag) : null))), footer ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-4) var(--space-6)',
      borderTop: '1px solid var(--border-subtle)',
      background: 'var(--cream)'
    }
  }, footer) : null);
}
Object.assign(__ds_scope, { EventScheduleCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/EventScheduleCard.jsx", error: String((e && e.message) || e) }); }

// components/content/SevaCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SevaCard({
  title,
  description,
  icon = 'hand-heart',
  wing,
  cadence,
  location,
  volunteers,
  onOpen,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("article", _extends({
    onClick: onOpen,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-6)',
      boxShadow: hover ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
      transform: hover ? 'translateY(var(--lift-hover))' : 'none',
      cursor: onOpen ? 'pointer' : 'default',
      transition: 'box-shadow var(--duration-base) var(--ease-serene), transform var(--duration-base) var(--ease-serene)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 'var(--radius-md)',
      display: 'grid',
      placeItems: 'center',
      background: 'var(--pink-100)',
      color: 'var(--pink-700)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 22
  })), wing ? /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "prem"
  }, wing) : null), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-serif-display)',
      fontSize: 'var(--text-h4)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-heading)',
      lineHeight: 'var(--leading-heading)'
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-sans-body)',
      fontSize: 'var(--text-small)',
      lineHeight: 'var(--leading-body)',
      color: 'var(--slate-600)',
      textWrap: 'pretty'
    }
  }, description), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--space-4)',
      paddingTop: 'var(--space-4)',
      borderTop: '1px solid var(--border-subtle)',
      fontFamily: 'var(--font-sans-body)',
      fontSize: 'var(--text-caption)',
      color: 'var(--text-muted)'
    }
  }, cadence ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "repeat",
    size: 14
  }), cadence) : null, location ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "map-pin",
    size: 14
  }), location) : null, volunteers ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "users",
    size: 14
  }), volunteers) : null));
}
Object.assign(__ds_scope, { SevaCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/SevaCard.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const base = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-2)',
  fontFamily: 'var(--font-sans-body)',
  fontWeight: 'var(--weight-medium)',
  letterSpacing: '.01em',
  borderRadius: 'var(--radius-pill)',
  border: '1px solid transparent',
  cursor: 'pointer',
  transition: 'background-color var(--duration-fast) var(--ease-serene), transform var(--duration-fast) var(--ease-serene), box-shadow var(--duration-base) var(--ease-serene), color var(--duration-fast) var(--ease-serene)',
  textDecoration: 'none',
  whiteSpace: 'nowrap'
};
const sizes = {
  sm: {
    fontSize: 'var(--text-caption)',
    padding: '8px 16px',
    minHeight: 36
  },
  md: {
    fontSize: 'var(--text-small)',
    padding: '11px 22px',
    minHeight: 44
  },
  lg: {
    fontSize: 'var(--text-body-size)',
    padding: '14px 30px',
    minHeight: 52
  }
};
const variants = {
  primary: {
    background: 'var(--action-primary)',
    color: 'var(--action-primary-text)'
  },
  secondary: {
    background: 'var(--action-secondary)',
    color: 'var(--action-secondary-text)'
  },
  outline: {
    background: 'transparent',
    color: 'var(--slate-700)',
    borderColor: 'var(--border-subtle)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-link)'
  },
  quiet: {
    background: 'var(--surface-truth)',
    color: 'var(--yellow-500)',
    borderColor: 'var(--border-truth)'
  }
};
const hovers = {
  primary: {
    background: 'var(--action-primary-hover)',
    boxShadow: 'var(--shadow-glow-warm)'
  },
  secondary: {
    background: 'var(--action-secondary-hover)',
    boxShadow: 'var(--shadow-glow-calm)'
  },
  outline: {
    background: 'var(--slate-100)',
    borderColor: 'var(--slate-300)'
  },
  ghost: {
    background: 'var(--blue-50)',
    color: 'var(--text-link-hover)'
  },
  quiet: {
    background: 'var(--yellow-100)'
  }
};
function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconAfter,
  disabled,
  fullWidth,
  href,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const Tag = href ? 'a' : 'button';
  const s = {
    ...base,
    ...sizes[size],
    ...variants[variant],
    ...(hover && !disabled ? hovers[variant] : null),
    ...(press && !disabled ? {
      transform: 'scale(var(--press-scale))'
    } : null),
    ...(disabled ? {
      opacity: .45,
      cursor: 'not-allowed',
      boxShadow: 'none'
    } : null),
    ...(fullWidth ? {
      width: '100%'
    } : null),
    ...style
  };
  return /*#__PURE__*/React.createElement(Tag, _extends({
    href: href,
    disabled: !href ? disabled : undefined,
    style: s,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false)
  }, rest), icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: size === 'lg' ? 20 : 16
  }) : null, children, iconAfter ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconAfter,
    size: size === 'lg' ? 20 : 16
  }) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Alert.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const tones = {
  note: {
    bg: 'var(--surface-truth)',
    border: 'var(--border-truth)',
    fg: 'var(--yellow-500)',
    icon: 'sun'
  },
  info: {
    bg: 'var(--surface-calm)',
    border: 'var(--border-calm)',
    fg: 'var(--blue-700)',
    icon: 'info'
  },
  success: {
    bg: '#F1F6F2',
    border: 'var(--signal-success)',
    fg: '#3F6B4E',
    icon: 'check-circle-2'
  },
  attention: {
    bg: '#FBF1EC',
    border: 'var(--signal-alert)',
    fg: '#8A4B2C',
    icon: 'alert-circle'
  }
};
function Alert({
  children,
  title,
  tone = 'note',
  style,
  ...rest
}) {
  const t = tones[tone];
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "status",
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      alignItems: 'flex-start',
      background: t.bg,
      border: '1px solid ' + t.border,
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-4) var(--space-5)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      color: t.fg,
      marginTop: 1
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: t.icon,
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans-body)',
      fontSize: 'var(--text-small)',
      lineHeight: 'var(--leading-body)',
      color: 'var(--slate-700)'
    }
  }, title ? /*#__PURE__*/React.createElement("strong", {
    style: {
      display: 'block',
      color: t.fg,
      fontWeight: 'var(--weight-semibold)'
    }
  }, title) : null, children));
}
Object.assign(__ds_scope, { Alert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Alert.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Dialog({
  open = true,
  title,
  children,
  footer,
  onClose,
  width = 460,
  style,
  ...rest
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 60,
      display: 'grid',
      placeItems: 'center',
      padding: 'var(--space-6)',
      background: 'rgba(31,41,55,.28)',
      backdropFilter: 'blur(3px)'
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", _extends({
    role: "dialog",
    "aria-modal": "true",
    onClick: e => e.stopPropagation(),
    style: {
      width: '100%',
      maxWidth: width,
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)',
      overflow: 'hidden',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 4,
      background: 'var(--dharma-rule)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-serif-display)',
      fontSize: 'var(--text-h3)',
      fontWeight: 'var(--weight-regular)',
      color: 'var(--text-heading)'
    }
  }, title), onClose ? /*#__PURE__*/React.createElement("button", {
    "aria-label": "Close",
    onClick: onClose,
    style: {
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--slate-500)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 20
  })) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-4)',
      fontFamily: 'var(--font-sans-body)',
      fontSize: 'var(--text-small)',
      lineHeight: 'var(--leading-body)',
      color: 'var(--slate-600)'
    }
  }, children)), footer ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 'var(--space-3)',
      padding: 'var(--space-4) var(--space-6)',
      borderTop: '1px solid var(--border-subtle)',
      background: 'var(--cream)'
    }
  }, footer) : null));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Checkbox({
  label,
  checked,
  defaultChecked,
  onChange,
  disabled,
  ...rest
}) {
  const [on, setOn] = React.useState(defaultChecked || false);
  const isOn = checked !== undefined ? checked : on;
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      fontFamily: 'var(--font-sans-body)',
      fontSize: 'var(--text-small)',
      color: 'var(--text-body)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? .5 : 1,
      minHeight: 44
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    checked: isOn,
    disabled: disabled,
    onChange: e => {
      setOn(e.target.checked);
      onChange && onChange(e);
    },
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      flex: '0 0 20px',
      borderRadius: 'var(--radius-sm)',
      display: 'grid',
      placeItems: 'center',
      background: isOn ? 'var(--action-primary)' : 'var(--white)',
      border: '1px solid ' + (isOn ? 'var(--pink-400)' : 'var(--slate-300)'),
      color: 'var(--pink-700)',
      transition: 'background var(--duration-fast) var(--ease-serene)'
    }
  }, isOn ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 13
  }) : null), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  label,
  hint,
  error,
  type = 'text',
  id,
  textarea,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const uid = id || React.useId();
  const Field = textarea ? 'textarea' : 'input';
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: uid,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      fontFamily: 'var(--font-sans-body)'
    }
  }, label ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-caption)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--slate-700)'
    }
  }, label) : null, /*#__PURE__*/React.createElement(Field, _extends({
    id: uid,
    type: textarea ? undefined : type,
    rows: textarea ? 3 : undefined,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      fontFamily: 'var(--font-sans-body)',
      fontSize: 'var(--text-small)',
      color: 'var(--text-body)',
      background: 'var(--white)',
      padding: '11px 14px',
      borderRadius: 'var(--radius-md)',
      border: '1px solid ' + (error ? 'var(--signal-alert)' : focus ? 'var(--border-focus)' : 'var(--border-subtle)'),
      boxShadow: focus ? 'var(--ring-focus)' : 'none',
      outline: 'none',
      minHeight: 44,
      resize: 'vertical',
      transition: 'border-color var(--duration-fast) var(--ease-serene), box-shadow var(--duration-fast) var(--ease-serene)',
      ...style
    }
  }, rest)), error || hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-caption)',
      color: error ? 'var(--pink-700)' : 'var(--text-muted)'
    }
  }, error || hint) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Select({
  label,
  options = [],
  hint,
  id,
  style,
  ...rest
}) {
  const uid = id || React.useId();
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: uid,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      fontFamily: 'var(--font-sans-body)'
    }
  }, label ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-caption)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--slate-700)'
    }
  }, label) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: uid,
    style: {
      appearance: 'none',
      width: '100%',
      fontFamily: 'var(--font-sans-body)',
      fontSize: 'var(--text-small)',
      color: 'var(--text-body)',
      background: 'var(--white)',
      padding: '11px 40px 11px 14px',
      minHeight: 44,
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-subtle)',
      outline: 'none',
      ...style
    }
  }, rest), options.map(o => /*#__PURE__*/React.createElement("option", {
    key: typeof o === 'string' ? o : o.value,
    value: typeof o === 'string' ? o : o.value
  }, typeof o === 'string' ? o : o.label))), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 14,
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
      color: 'var(--slate-500)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 16
  }))), hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-caption)',
      color: 'var(--text-muted)'
    }
  }, hint) : null);
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function Switch({
  label,
  defaultOn = false,
  onChange,
  disabled
}) {
  const [on, setOn] = React.useState(defaultOn);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 12,
      fontFamily: 'var(--font-sans-body)',
      fontSize: 'var(--text-small)',
      color: 'var(--text-body)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? .5 : 1,
      minHeight: 44
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "switch",
    "aria-checked": on,
    disabled: disabled,
    onClick: () => {
      setOn(!on);
      onChange && onChange(!on);
    },
    style: {
      width: 46,
      height: 26,
      borderRadius: 'var(--radius-pill)',
      border: '1px solid ' + (on ? 'var(--blue-400)' : 'var(--slate-300)'),
      background: on ? 'var(--blue-200)' : 'var(--slate-100)',
      padding: 2,
      cursor: 'inherit',
      transition: 'background var(--duration-base) var(--ease-serene)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      width: 20,
      height: 20,
      borderRadius: '50%',
      background: 'var(--white)',
      boxShadow: 'var(--shadow-sm)',
      transform: 'translateX(' + (on ? 20 : 0) + 'px)',
      transition: 'transform var(--duration-base) var(--ease-serene)'
    }
  })), label);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function NavBar({
  org = 'Sri Sathya Sai Seva Organisation',
  region = 'Delhi NCR',
  links = ['About', 'Seva', 'Youth', 'Events', 'Contact'],
  active,
  onNavigate,
  cta = 'Volunteer',
  onCta,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("header", _extends({
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 20,
      background: 'rgba(255,255,255,.88)',
      backdropFilter: 'var(--veil-blur)',
      WebkitBackdropFilter: 'var(--veil-blur)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '0 var(--gutter-desktop)',
      height: 76,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onNavigate && onNavigate('Home');
    },
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      textDecoration: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 40,
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
      border: '1px dashed var(--pink-300)',
      color: 'var(--pink-600)',
      fontFamily: 'var(--font-serif-display)',
      fontSize: 15
    }
  }, "Sai"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      lineHeight: 1.1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-serif-display)',
      fontSize: 17,
      color: 'var(--text-heading)'
    }
  }, org), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans-body)',
      fontSize: 11,
      letterSpacing: 'var(--tracking-eyebrow)',
      textTransform: 'uppercase',
      color: 'var(--blue-600)'
    }
  }, region))), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)'
    }
  }, links.map(l => {
    const on = active === l;
    return /*#__PURE__*/React.createElement("a", {
      key: l,
      href: '#' + l.toLowerCase(),
      onClick: e => {
        e.preventDefault();
        onNavigate && onNavigate(l);
      },
      style: {
        fontFamily: 'var(--font-sans-body)',
        fontSize: 'var(--text-small)',
        fontWeight: 'var(--weight-medium)',
        color: on ? 'var(--pink-700)' : 'var(--slate-600)',
        background: on ? 'var(--pink-100)' : 'transparent',
        padding: '9px 14px',
        borderRadius: 'var(--radius-pill)',
        textDecoration: 'none',
        transition: 'background var(--duration-fast) var(--ease-serene), color var(--duration-fast) var(--ease-serene)'
      }
    }, l);
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      height: 24,
      background: 'var(--border-subtle)',
      margin: '0 var(--space-2)'
    }
  }), /*#__PURE__*/React.createElement("button", {
    "aria-label": "Search",
    style: {
      width: 40,
      height: 40,
      borderRadius: '50%',
      border: '1px solid var(--border-subtle)',
      background: 'var(--white)',
      color: 'var(--slate-600)',
      display: 'grid',
      placeItems: 'center',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 17
  })), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "sm",
    onClick: onCta
  }, cta))), /*#__PURE__*/React.createElement(__ds_scope.DharmaRule, {
    height: 2
  }));
}
Object.assign(__ds_scope, { NavBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavBar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Tabs({
  tabs = [],
  value,
  onChange,
  style,
  ...rest
}) {
  const [inner, setInner] = React.useState(tabs[0]);
  const current = value !== undefined ? value : inner;
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "tablist",
    style: {
      display: 'inline-flex',
      gap: 4,
      padding: 4,
      background: 'var(--slate-100)',
      borderRadius: 'var(--radius-pill)',
      ...style
    }
  }, rest), tabs.map(t => {
    const on = t === current;
    return /*#__PURE__*/React.createElement("button", {
      key: t,
      role: "tab",
      "aria-selected": on,
      onClick: () => {
        setInner(t);
        onChange && onChange(t);
      },
      style: {
        fontFamily: 'var(--font-sans-body)',
        fontSize: 'var(--text-small)',
        fontWeight: 'var(--weight-medium)',
        padding: '9px 18px',
        minHeight: 40,
        borderRadius: 'var(--radius-pill)',
        border: 'none',
        cursor: 'pointer',
        background: on ? 'var(--white)' : 'transparent',
        color: on ? 'var(--slate-800)' : 'var(--slate-500)',
        boxShadow: on ? 'var(--shadow-sm)' : 'none',
        transition: 'background var(--duration-fast) var(--ease-serene), color var(--duration-fast) var(--ease-serene)'
      }
    }, t);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const tones = {
  plain: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)'
  },
  calm: {
    background: 'var(--surface-calm)',
    border: '1px solid var(--border-calm)'
  },
  warm: {
    background: 'var(--surface-warm)',
    border: '1px solid var(--border-warm)'
  },
  truth: {
    background: 'var(--surface-truth)',
    border: '1px solid var(--border-truth)'
  }
};
function Card({
  children,
  tone = 'plain',
  capped,
  interactive,
  padding = 'var(--card-padding)',
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: hover && interactive ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
      transform: hover && interactive ? 'translateY(var(--lift-hover))' : 'none',
      transition: 'box-shadow var(--duration-base) var(--ease-serene), transform var(--duration-base) var(--ease-serene)',
      ...tones[tone],
      ...style
    }
  }, rest), capped ? /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      background: 'var(--dharma-rule)'
    }
  }) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      padding
    }
  }, children));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/Card.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/ColorToken.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ColorToken({
  name,
  hex,
  meaning,
  variable,
  onDark,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      border: '1px solid var(--border-subtle)',
      background: 'var(--surface-card)',
      boxShadow: 'var(--shadow-xs)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 84,
      background: hex,
      display: 'flex',
      alignItems: 'flex-end',
      padding: 'var(--space-3)',
      color: onDark ? 'var(--white)' : 'var(--slate-700)',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-caption)'
    }
  }, hex), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-4)',
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-serif-display)',
      fontSize: 'var(--text-h4)',
      color: 'var(--text-heading)'
    }
  }, name), meaning ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans-body)',
      fontSize: 'var(--text-caption)',
      color: 'var(--text-muted)',
      lineHeight: 1.5
    }
  }, meaning) : null, variable ? /*#__PURE__*/React.createElement("code", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--slate-500)',
      marginTop: 4
    }
  }, variable) : null));
}
Object.assign(__ds_scope, { ColorToken });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/ColorToken.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/SectionHeading.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      alignItems: align === 'center' ? 'center' : 'flex-start',
      textAlign: align,
      maxWidth: 'var(--measure-prose)',
      marginInline: align === 'center' ? 'auto' : undefined,
      ...style
    }
  }, rest), eyebrow ? /*#__PURE__*/React.createElement(__ds_scope.Eyebrow, null, eyebrow) : null, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-serif-display)',
      fontSize: 'var(--text-h2)',
      lineHeight: 'var(--leading-heading)',
      fontWeight: 'var(--weight-regular)',
      color: 'var(--text-heading)',
      textWrap: 'pretty'
    }
  }, title), description ? /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-sans-body)',
      fontSize: 'var(--text-lead)',
      lineHeight: 'var(--leading-body)',
      color: 'var(--text-muted)',
      textWrap: 'pretty'
    }
  }, description) : null);
}
Object.assign(__ds_scope, { SectionHeading });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/SectionHeading.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Home.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  NavBar,
  Button,
  Badge,
  Eyebrow,
  DharmaRule,
  Card,
  SectionHeading,
  ColorToken,
  QuoteCard,
  SevaCard,
  EventScheduleCard,
  Tabs,
  Alert,
  Dialog,
  Input,
  Select,
  Checkbox,
  Icon
} = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const D = window.SSSSOData;
function Hero({
  onVolunteer
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      background: 'linear-gradient(180deg,var(--blue-50) 0%,var(--cream) 100%)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '96px var(--gutter-desktop)',
      display: 'grid',
      gridTemplateColumns: '1.05fr .95fr',
      gap: '64px',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, null, "Sri Sathya Sai Seva Organisation \xB7 Delhi NCR"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '20px 0 0',
      fontFamily: 'var(--font-serif-display)',
      fontSize: 'var(--text-h1)',
      lineHeight: 'var(--leading-tight)',
      letterSpacing: 'var(--tracking-display)',
      fontWeight: 'var(--weight-regular)',
      color: 'var(--text-heading)',
      textWrap: 'pretty'
    }
  }, "Love all, serve all.", /*#__PURE__*/React.createElement("br", null), "Together, across the capital region."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '20px 0 0',
      maxWidth: 'var(--measure-prose)',
      fontSize: 'var(--text-lead)',
      lineHeight: 'var(--leading-body)',
      color: 'var(--slate-600)',
      textWrap: 'pretty'
    }
  }, "Bhajans, study circles, Bal Vikas classes and service in eight districts \u2014 open to everyone, free always. Come as you are."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      marginTop: 'var(--space-8)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    iconAfter: "arrow-right",
    onClick: onVolunteer
  }, "Join a seva"), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "outline",
    icon: "map-pin"
  }, "Find your centre")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-8)',
      marginTop: 'var(--space-10)',
      paddingTop: 'var(--space-6)',
      borderTop: '1px solid var(--border-subtle)'
    }
  }, [['8', 'Districts'], ['46', 'Weekly bhajans'], ['1,200+', 'Active sevadals']].map(([n, l]) => /*#__PURE__*/React.createElement("div", {
    key: l
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-serif-display)',
      fontSize: 32,
      color: 'var(--blue-700)'
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-caption)',
      color: 'var(--text-muted)',
      marginTop: 2
    }
  }, l))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(QuoteCard, {
    date: D.quote.date,
    quote: D.quote.text
  }), /*#__PURE__*/React.createElement(Alert, {
    tone: "note",
    title: "Ganesh Chaturthi week"
  }, "Extended bhajans at all NCR centres from 29 August."))));
}
function Tokens() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--white)',
      borderTop: '1px solid var(--border-subtle)',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '96px var(--gutter-desktop)'
    }
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    align: "center",
    eyebrow: "Design tokens",
    title: "The Prashanti palette",
    description: "Three colours carry the three values the organisation is built on. Everything else is white, cream and slate."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 'var(--space-5)',
      marginTop: 'var(--space-10)'
    }
  }, /*#__PURE__*/React.createElement(ColorToken, {
    name: "Prashanti Pink",
    hex: "#F7CAC9",
    meaning: "Prem \u2014 Love. The rose of the main Mandir. Primary buttons, active states, warm accents.",
    variable: "--action-primary"
  }), /*#__PURE__*/React.createElement(ColorToken, {
    name: "Prashanti Blue",
    hex: "#AEC6CF",
    meaning: "Shanti \u2014 Peace. The domes and arches. Headers, calm informational sections.",
    variable: "--surface-calm"
  }), /*#__PURE__*/React.createElement(ColorToken, {
    name: "Ashram Yellow",
    hex: "#FCE883",
    meaning: "Sathya \u2014 Truth. Buttery highlight. Notices and decorative borders only.",
    variable: "--signal-note"
  }), /*#__PURE__*/React.createElement(ColorToken, {
    name: "Slate & Cream",
    hex: "#1F2937",
    meaning: "Purity. Dark slate for text \u2014 never pure black \u2014 on white and #FAFAFA cream.",
    variable: "--text-body",
    onDark: true
  }))));
}
function Seva({
  onOpen
}) {
  const wings = ['All', ...Array.from(new Set(D.seva.map(s => s.wing)))];
  const [filter, setFilter] = React.useState('All');
  const list = filter === 'All' ? D.seva : D.seva.filter(s => s.wing === filter);
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--surface-page)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '96px var(--gutter-desktop)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: 'var(--space-8)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    eyebrow: "Seva activities",
    title: "Service is worship in action",
    description: "Six ongoing wings. Every one of them welcomes newcomers with no experience."
  }), /*#__PURE__*/React.createElement(Tabs, {
    tabs: wings,
    value: filter,
    onChange: setFilter
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 'var(--space-5)',
      marginTop: 'var(--space-10)'
    }
  }, list.map(s => /*#__PURE__*/React.createElement(SevaCard, _extends({
    key: s.title
  }, s, {
    onOpen: () => onOpen(s)
  }))))));
}
function Events({
  onRegister
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--surface-calm)',
      borderTop: '1px solid var(--border-calm)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '96px var(--gutter-desktop)',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '64px',
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SectionHeading, {
    eyebrow: "Calendar",
    title: "Upcoming bhajans & events",
    description: "Bhajans are held every Thursday and Sunday. Festivals and study circles are listed as they are announced."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      marginTop: 'var(--space-6)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    icon: "calendar-days",
    onClick: onRegister
  }, "Register to attend"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    iconAfter: "arrow-right"
  }, "Full calendar")), /*#__PURE__*/React.createElement(Card, {
    tone: "plain",
    style: {
      marginTop: 'var(--space-8)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      marginBottom: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "map-pin",
    size: 18,
    color: "var(--blue-600)"
  }), /*#__PURE__*/React.createElement("strong", {
    style: {
      fontSize: 'var(--text-small)'
    }
  }, "Centres across the region")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8
    }
  }, D.centres.map(c => /*#__PURE__*/React.createElement(Badge, {
    key: c,
    tone: "neutral"
  }, c))))), /*#__PURE__*/React.createElement(EventScheduleCard, {
    events: D.events,
    footer: /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "sm",
      iconAfter: "arrow-right"
    }, "Subscribe to the calendar")
  })));
}
function Volunteer() {
  return /*#__PURE__*/React.createElement("section", {
    id: "contact",
    style: {
      background: 'var(--white)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '96px var(--gutter-desktop)',
      display: 'grid',
      gridTemplateColumns: '.9fr 1.1fr',
      gap: '64px',
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    eyebrow: "Get in touch",
    title: "Offer your hands",
    description: "Tell us where you live and what you would like to do. A samithi convener will write back within a week."
  }), /*#__PURE__*/React.createElement(Card, {
    capped: true,
    padding: "var(--space-8)"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Full name",
    placeholder: "Your name"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Email",
    placeholder: "you@example.org"
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Nearest centre",
    options: D.centres
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Seva you are drawn to",
    options: D.seva.map(s => s.wing)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: '1 / -1'
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Anything you would like us to know",
    textarea: true,
    placeholder: "Optional"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: '1 / -1',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 'var(--space-4)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Checkbox, {
    label: "I can serve on weekends",
    defaultChecked: true
  }), /*#__PURE__*/React.createElement(Button, {
    icon: "hand-heart"
  }, "Send"))))));
}
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--surface-inverse)',
      color: 'var(--text-on-inverse)'
    }
  }, /*#__PURE__*/React.createElement(DharmaRule, {
    height: 3
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '64px var(--gutter-desktop) 40px',
      display: 'grid',
      gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
      gap: 'var(--space-10)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-serif-display)',
      fontSize: 22
    }
  }, "Sri Sathya Sai Seva Organisation"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      letterSpacing: 'var(--tracking-eyebrow)',
      textTransform: 'uppercase',
      color: 'var(--blue-200)',
      marginTop: 6
    }
  }, "Delhi NCR"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--text-small)',
      lineHeight: 'var(--leading-body)',
      color: 'rgba(255,255,255,.75)',
      maxWidth: '42ch',
      marginTop: 'var(--space-4)'
    }
  }, "All activities are free and open to people of every faith. Nothing is ever collected from the public.")), [['Organisation', ['About', 'Sarva Dharma', 'Samithis', 'Reports']], ['Participate', ['Seva', 'Bhajans', 'Bal Vikas', 'Youth Wing']], ['Contact', ['Write to us', 'Centres', 'Volunteer', 'Newsletter']]].map(([h, items]) => /*#__PURE__*/React.createElement("div", {
    key: h
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      letterSpacing: 'var(--tracking-eyebrow)',
      textTransform: 'uppercase',
      color: 'var(--blue-200)'
    }
  }, h), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      padding: 0,
      margin: 'var(--space-4) 0 0',
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, items.map(i => /*#__PURE__*/React.createElement("li", {
    key: i
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: 'rgba(255,255,255,.85)',
      textDecoration: 'none',
      fontSize: 'var(--text-small)'
    }
  }, i))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid rgba(255,255,255,.14)',
      padding: '20px var(--gutter-desktop)',
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      fontSize: 'var(--text-caption)',
      color: 'rgba(255,255,255,.6)'
    }
  }, "\xA9 2026 Sri Sathya Sai Seva Organisation, Delhi NCR. A volunteer body."));
}
function Site() {
  const [page, setPage] = React.useState('Home');
  const [modal, setModal] = React.useState(null);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-page)',
      minHeight: '100vh'
    }
  }, /*#__PURE__*/React.createElement(NavBar, {
    active: page,
    onNavigate: setPage,
    onCta: () => setModal({
      kind: 'volunteer'
    })
  }), /*#__PURE__*/React.createElement(Hero, {
    onVolunteer: () => setModal({
      kind: 'volunteer'
    })
  }), /*#__PURE__*/React.createElement(Tokens, null), /*#__PURE__*/React.createElement(Seva, {
    onOpen: s => setModal({
      kind: 'seva',
      seva: s
    })
  }), /*#__PURE__*/React.createElement(Events, {
    onRegister: () => setModal({
      kind: 'event'
    })
  }), /*#__PURE__*/React.createElement(Volunteer, null), /*#__PURE__*/React.createElement(Footer, null), modal ? /*#__PURE__*/React.createElement(Dialog, {
    title: modal.kind === 'seva' ? modal.seva.title : modal.kind === 'event' ? 'Register to attend' : 'Join a seva',
    onClose: () => setModal(null),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "outline",
      size: "sm",
      onClick: () => setModal(null)
    }, "Not now"), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      onClick: () => setModal(null)
    }, "Confirm"))
  }, modal.kind === 'seva' ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "prem"
  }, modal.seva.wing), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0
    }
  }, modal.seva.description), /*#__PURE__*/React.createElement(Alert, {
    tone: "info"
  }, modal.seva.cadence, " \xB7 ", modal.seva.location, " \xB7 ", modal.seva.volunteers)) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Full name",
    placeholder: "Your name"
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Nearest centre",
    options: D.centres
  }), /*#__PURE__*/React.createElement(Checkbox, {
    label: "Send me a reminder the evening before",
    defaultChecked: true
  }))) : null);
}
window.Site = Site;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Home.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/data.js
try { (() => {
window.SSSSOData = {
  quote: {
    date: '8 August 2026',
    text: 'Hands that serve are holier than lips that pray.'
  },
  seva: [{
    title: 'Narayana Seva',
    icon: 'hand-heart',
    wing: 'Food Seva',
    description: 'Warm meals cooked and shared with families living near the Dwarka centre, every Sunday after morning bhajans.',
    cadence: 'Every Sunday',
    location: 'Dwarka Sec 6',
    volunteers: '40 sevadals'
  }, {
    title: 'Medical Camps',
    icon: 'stethoscope',
    wing: 'Medical Seva',
    description: 'Free general check-ups, eye screening and medicines at village and resettlement colonies across the NCR.',
    cadence: 'Monthly',
    location: 'Rotating venues',
    volunteers: '22 doctors'
  }, {
    title: 'Bal Vikas Classes',
    icon: 'graduation-cap',
    wing: 'Education',
    description: 'Human values classes for children aged 6 to 14 — stories, silent sitting, group singing and community projects.',
    cadence: 'Saturdays',
    location: 'Noida Centre',
    volunteers: '18 gurus'
  }, {
    title: 'Water & Sanitation',
    icon: 'droplets',
    wing: 'Community',
    description: 'Clean drinking water points maintained with local residents, plus quarterly sanitation drives.',
    cadence: 'Quarterly',
    location: 'Faridabad',
    volunteers: '30 sevadals'
  }, {
    title: 'Tree Planting',
    icon: 'sprout',
    wing: 'Environment',
    description: 'Native saplings planted and tended through their first two monsoons alongside neighbourhood groups.',
    cadence: 'Seasonal',
    location: 'Gurugram',
    volunteers: '55 sevadals'
  }, {
    title: 'Youth Wing Outreach',
    icon: 'heart-handshake',
    wing: 'Youth',
    description: 'Students and working professionals leading blood donation drives, tutoring and elder-care visits.',
    cadence: 'Fortnightly',
    location: 'Delhi NCR',
    volunteers: '120 members'
  }],
  events: [{
    day: '14',
    month: 'Aug',
    name: 'Nagar Sankirtan',
    time: '6:00 AM',
    venue: 'Dwarka Sector 6',
    tag: 'Weekly'
  }, {
    day: '17',
    month: 'Aug',
    name: 'Bal Vikas Class',
    time: '10:00 AM',
    venue: 'Noida Centre',
    tag: 'Children',
    tone: 'sathya'
  }, {
    day: '23',
    month: 'Aug',
    name: 'Sunday Bhajans',
    time: '5:30 PM',
    venue: 'Rohini Centre',
    tag: 'Bhajan'
  }, {
    day: '29',
    month: 'Aug',
    name: 'Ganesh Chaturthi',
    time: '6:30 PM',
    venue: 'Gurugram Centre',
    tag: 'Festival',
    tone: 'prem'
  }, {
    day: '07',
    month: 'Sep',
    name: 'Study Circle',
    time: '7:00 PM',
    venue: 'Online',
    tag: 'Study Circle'
  }],
  centres: ['Dwarka', 'Rohini', 'Noida', 'Gurugram', 'Faridabad', 'Ghaziabad', 'South Delhi', 'Vasant Kunj']
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/data.js", error: String((e && e.message) || e) }); }

__ds_ns.EventScheduleCard = __ds_scope.EventScheduleCard;

__ds_ns.QuoteCard = __ds_scope.QuoteCard;

__ds_ns.SevaCard = __ds_scope.SevaCard;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.DharmaRule = __ds_scope.DharmaRule;

__ds_ns.Eyebrow = __ds_scope.Eyebrow;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.Alert = __ds_scope.Alert;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.NavBar = __ds_scope.NavBar;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.ColorToken = __ds_scope.ColorToken;

__ds_ns.SectionHeading = __ds_scope.SectionHeading;

})();
