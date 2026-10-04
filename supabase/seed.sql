-- Demo catalog for a sample org (no auth users required). Run after migrations.
insert into organizations(id,name,currency) values ('00000000-0000-0000-0000-0000000000a1','Demo Robotics Pvt Ltd','INR') on conflict do nothing;
insert into product_categories(organization_id,name) select '00000000-0000-0000-0000-0000000000a1', n from unnest(array['Development Boards','Sensors','3D Printing','Robotics','IoT Modules']) n on conflict do nothing;
insert into products(organization_id,category_id,name,slug,sku,description,price,stock,min_stock)
select '00000000-0000-0000-0000-0000000000a1',(select id from product_categories where organization_id='00000000-0000-0000-0000-0000000000a1' and name=c),n,lower(replace(n,' ','-')),s,d,p,st,5
from (values
 ('Development Boards','ESP32 DevKit V1','ESP32-DEVKIT','Dual-core Wi-Fi and Bluetooth microcontroller board, 30 pins.',599,120),
 ('Development Boards','Arduino Uno R3','ARD-UNO-R3','ATmega328P board for learning and prototyping.',899,60),
 ('Development Boards','Raspberry Pi 4 (4GB)','RPI4-4GB','Quad-core single-board computer.',5499,3),
 ('Sensors','DHT22 Temperature Sensor','SNS-DHT22','Digital temperature and humidity sensor.',349,200),
 ('Sensors','HC-SR04 Ultrasonic Sensor','SNS-HCSR04','Distance sensor, 2cm to 400cm.',99,350),
 ('3D Printing','PLA Filament 1kg Black','FIL-PLA-BLK','1.75mm PLA, consistent diameter.',1099,40),
 ('3D Printing','0.4mm Brass Nozzle (5 pack)','NOZ-04-5','Hardened-compatible MK8 nozzles.',299,2),
 ('Robotics','SG90 Micro Servo','ROB-SG90','9g servo for small robots.',149,150),
 ('Robotics','L298N Motor Driver','ROB-L298N','Dual H-bridge motor driver module.',229,80),
 ('IoT Modules','SIM800L GSM Module','IOT-SIM800L','GSM/GPRS module for remote telemetry.',699,25)
) as t(c,n,s,d,p,st) on conflict do nothing;

-- Demo courses (published) with 6 lessons each
insert into courses(id,organization_id,title,description,level,published) values
 ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000a1','ESP32 for IoT Beginners','Build Wi-Fi connected sensors from scratch.','beginner',true),
 ('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000a1','3D Printing for Prototyping','Design, slice and print functional parts.','intermediate',true) on conflict do nothing;
insert into lessons(course_id,position,title,content)
select c, n, t, 'Lesson content goes here. Replace with your material.' from (values
 ('00000000-0000-0000-0000-0000000000c1'::uuid),('00000000-0000-0000-0000-0000000000c2'::uuid)) v(c),
 unnest(array['Introduction','Setting up your tools','Core concepts','Hands-on project','Debugging','Next steps']) with ordinality as x(t,n) on conflict do nothing;
