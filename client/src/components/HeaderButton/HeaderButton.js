import "./HeaderButton.css";

/**
 * 헤더 아이콘 버튼 — 위에 아이콘 그림, 아래에 이름.
 * image 는 import 한 그림 (./icons 의 HEADER_ICONS). 나머지 속성은 <button> 에 그대로 넘김
 * (아이콘 글꼴을 쓰지 않고 그림 파일만 씀 — 인터넷·글꼴 로딩과 상관없이 항상 나옴)
 */
function HeaderButton({ image, label, className = "", ...buttonProps }) {
  return (
    <button type="button" className={`hdr-btn ${className}`} {...buttonProps}>
      <img className="hdr-btn-icon" src={image} alt="" draggable="false" />
      <span className="hdr-btn-label">{label}</span>
    </button>
  );
}

export default HeaderButton;
