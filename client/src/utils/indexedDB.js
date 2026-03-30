// IndexedDB를 사용한 미디어 파일 저장 유틸리티

const DB_NAME = 'seoul-led-media';
const DB_VERSION = 1;
const STORE_NAME = 'media';

// IndexedDB 초기화
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

// 미디어 파일 저장
export const saveMediaToIndexedDB = async (sectionIndex, mediaData) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const data = {
      type: mediaData.type,
      base64: mediaData.base64,
      fileName: mediaData.fileName || null,
      timestamp: Date.now(),
    };
    
    return new Promise((resolve, reject) => {
      const request = store.put(data, sectionIndex);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('IndexedDB 저장 실패:', error);
    throw error;
  }
};

// 미디어 파일 불러오기
export const loadMediaFromIndexedDB = async (sectionIndex) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.get(sectionIndex);
      request.onsuccess = () => {
        if (request.result) {
          resolve({
            type: request.result.type,
            url: request.result.base64, // base64를 직접 URL로 사용
            base64: request.result.base64,
            fileName: request.result.fileName || null,
          });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('IndexedDB 로드 실패:', error);
    return null;
  }
};

// 모든 미디어 파일 불러오기
export const loadAllMediaFromIndexedDB = async () => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const mediaMap = {};
      
      // getAllKeys()로 키 목록 가져오기
      const keysRequest = store.getAllKeys();
      keysRequest.onsuccess = () => {
        const keys = keysRequest.result;
        if (keys.length === 0) {
          resolve({});
          return;
        }
        
        // 각 키에 대해 미디어 불러오기
        const mediaPromises = keys.map(key => 
          loadMediaFromIndexedDB(key)
        );
        
        Promise.all(mediaPromises).then(mediaArray => {
          keys.forEach((key, index) => {
            if (mediaArray[index]) {
              mediaMap[key] = mediaArray[index];
            }
          });
          resolve(mediaMap);
        }).catch(reject);
      };
      keysRequest.onerror = () => reject(keysRequest.error);
    });
  } catch (error) {
    console.error('IndexedDB 전체 로드 실패:', error);
    return {};
  }
};

// 미디어 파일 삭제
export const deleteMediaFromIndexedDB = async (sectionIndex) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(sectionIndex);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('IndexedDB 삭제 실패:', error);
    throw error;
  }
};
