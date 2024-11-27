from PIL import Image, ImageDraw

# 32x32 크기의 새 이미지 생성
img = Image.new('RGB', (32, 32), color='white')
draw = ImageDraw.Draw(img)

# 배경 원 그리기 (파란색)
draw.ellipse([2, 2, 30, 30], fill='#2196F3')

# 시리얼 포트 심볼 (흰색)
draw.rectangle([8, 10, 24, 22], fill='white')
draw.rectangle([8, 14, 24, 18], fill='white')
draw.rectangle([8, 18, 24, 22], fill='white')

# ICO 파일로 저장
img.save('serial_monitor.ico', format='ICO', sizes=[(32, 32)])