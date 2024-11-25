import React from 'react';
import './DistrictSelector.css';

const districts = [
  "강남구", "강동구", "강북구", "강서구", "관악구", 
  "광진구", "구로구", "금천구", "노원구", "도봉구",
  "동대문구", "동작구", "마포구", "서대문구", "서초구",
  "성동구", "성북구", "송파구", "양천구", "영등포구",
  "용산구", "은평구", "종로구", "중구", "중랑구"
];

function DistrictSelector({ selectedDistrict, onDistrictChange }) {
  return (
    <div className="DistrictSelector">
      <h1>서울시 구 선택</h1>
      <select 
        id="districtSelect"
        value={selectedDistrict}
        onChange={(e) => onDistrictChange(e.target.value)}
      >
        {districts.map((district) => (
          <option key={district} value={district}>
            {district}
          </option>
        ))}
      </select>
    </div>
  );
}

export default DistrictSelector;