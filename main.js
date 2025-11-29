import * as THREE from "three";
import {
    computeBoundsTree,
    MeshBVHVisualizer
} from "three-mesh-bvh";
import { OrbitControls } from "three/module/controls/OrbitControls.js";
import { STLLoader } from "three/module/loaders/STLLoader.js";
import { GUI } from "three/module/libs/lil-gui.module.min.js";
import { OBJExporter } from "three/module/exporters/OBJExporter.js";
import { STLExporter } from "three/module/exporters/STLExporter.js";
import { SimplifyModifier } from "three/module/modifiers/SimplifyModifier.js";

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
// THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
// THREE.Mesh.prototype.raycast = acceleratedRaycast;

// ===== DOM 取得 =====
const app = document.getElementById("app");
const sourceSelect = document.getElementById("modelSource");
const loadBtn = document.getElementById("loadModelBtn");
const fileInput = document.getElementById("fileInput");

const stlLoader = new STLLoader();

// ===== 讀取模型（新的入口） =====

// 點「載入模型」按鈕
loadBtn.addEventListener("click", () => {
    const mode = sourceSelect.value;

    if (mode === "upload") {
        // 跟你原本一樣，用 <input type="file">
        fileInput.click();
    } else if (mode === "default") {
        // 載入預設 2.stl
        fetch("2.stl")
            .then((res) => {
                if (!res.ok) throw new Error("載入 2.stl 失敗");
                return res.arrayBuffer();
            })
            .then((buffer) => {
                const geometry = stlLoader.parse(buffer);
                draw(geometry);
            })
            .catch((err) => {
                console.error(err);
                alert("無法讀取 2.stl，請確認檔案是否與 index.html 在同一資料夾");
            });
    }
});

// 選擇檔案後
fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const filename = file.name.toLowerCase();
    if (!filename.endsWith(".stl")) {
        alert("請選擇 .stl 檔案");
        return;
    }

    const reader = new FileReader();
    reader.onloadend = function (ev) {
        const geometry = stlLoader.parse(ev.target.result);
        draw(geometry);
    };
    // 跟你原本一樣使用 binaryString（這裡用 ArrayBuffer 也可以，但我盡量貼近你原本）
    reader.readAsBinaryString(file);
});

// ===== 以下開始：完全照你原本的 3D 功能結構 =====

let renderer, scene, camera, helper, material, light1, light2, controls, mesh, simplified;

function initrenderer() {
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0xbbbbbb, 1); // 灰白背景（跟原本一樣）
    app.appendChild(renderer.domElement);
    renderer.antialias = true;
    renderer.localClippingEnabled = true;
}

function initscene() {
    scene = new THREE.Scene();
}

function initcamera() {
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        1,
        1000
    );
    camera.position.set(0, 10, 15);
    camera.lookAt(0, 0, 0);
}

const clipPlanes = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), 5.5),
    new THREE.Plane(new THREE.Vector3(0, -1, 0), 5.5),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), 5.5)
];

function initmaterial() {
    material = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        clippingPlanes: clipPlanes,
        clipIntersection: false
    });
    material.flatShading = true;
}

function initlight() {
    light1 = new THREE.DirectionalLight(0xffffff, 1.0);
    light1.position.set(50, 50, 300);
    scene.add(light1);

    light2 = new THREE.DirectionalLight(0xffffff, 1.0);
    light2.position.set(-50, -50, -300);
    scene.add(light2);
}

function initControls() {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableZoom = true;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 1;
    controls.minDistance = 1;
    controls.maxDistance = 1000;
    controls.enablePan = true;
}

function initModel(geometry) {
    geometry.center();
    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    mesh.rotation.set(4.5, 0, 1);
}

function initsimpliModel() {
    const modifier = new SimplifyModifier();
    simplified = mesh.clone();
    simplified.material = simplified.material.clone();
    const count = Math.floor(
        simplified.geometry.attributes.position.count * 0.1
    );
    simplified.geometry = modifier.modify(simplified.geometry, count);
    simplified.visible = false;
    scene.add(simplified);
    simplified.rotation.set(4.5, 0, 1);
}

function animate() {
    renderer.render(scene, camera);
    controls.update();
    requestAnimationFrame(animate);
}

function draw(geometry) {
    // 跟你原本完全一樣：載入模型後才初始化整套東西 + GUI

    initrenderer();
    initscene();
    initcamera();
    initmaterial();
    initlight();
    initControls();
    initModel(geometry);
    initsimpliModel();
    animate();

    const gui = new GUI();

    const control = new (function () {
        this.reset = function () {
            position_x.setValue(0);
            resize_scale.setValue(1);
            light_intensity.setValue(1);
        };
        this.visible = true;
        this.simplified_visible = false;
        this.position = 0;
        this.helpers = false;
        this.AxesHelper = false;
        this.ExportOBJ = function () {
            const exporter = new OBJExporter();
            const result = exporter.parse(mesh);
            const data = new Blob([result], { type: "text/plain" });
            save(data, "model.obj");
        };
        this.ExportSTL = function () {
            const exporter = new STLExporter();
            const result = exporter.parse(mesh, { binary: true });
            const data = new Blob([result], { type: "text/plain" });
            save(data, "model.stl");
        };
        this.newShading = "平滑著色";
        this.intensity = 1;
        this.clipIntersection = false;
        this.planeConstant = 5.5;
        this.displayhelper = false;
        this.helperDepth = 10;
        this.scale = 1;
    })();

    function save(result, filename) {
        const newLink = document.createElement("a");
        newLink.download = filename;
        newLink.href = window.webkitURL.createObjectURL(result);
        newLink.target = "_blank";
        newLink.click();
    }

    gui.add(control, "reset").name("重置").listen();

    const position_x = gui
        .add(control, "position", 0, 100)
        .name("模型位置")
        .listen()
        .onChange(function (value) {
            mesh.position.x = value;
        });

    gui.add(control, "visible")
        .name("原始模型顯示")
        .listen()
        .onChange(function (value) {
            mesh.visible = value;
        });

    gui.add(control, "simplified_visible")
        .name("簡化模型顯示")
        .listen()
        .onChange(function (value) {
            simplified.visible = value;
        });

    const AxesHelper = new THREE.AxesHelper(100);
    scene.add(AxesHelper);
    AxesHelper.visible = false;

    gui.add(control, "AxesHelper")
        .name("顯示坐標軸XYZ")
        .listen()
        .onChange(function (value) {
            AxesHelper.visible = value;
        });

    const MeterialColor = {
        color1: "#ffffff",
        color2: "#ffffff"
    };
    gui.addColor(MeterialColor, "color1")
        .name("原始模型顏色")
        .onChange(function (value) {
            material.color.set(value);
        });
    gui.addColor(MeterialColor, "color2")
        .name("簡化模型顏色")
        .onChange(function (value) {
            simplified.material.color.set(value);
        });

    gui.add(control, "ExportOBJ").name("輸出OBJ檔案").listen();
    gui.add(control, "ExportSTL").name("輸出STL檔案").listen();

    gui.add(control, "newShading", ["框線", "平滑著色"])
        .name("著色模式")
        .onChange(function (value) {
            if (value === "框線") {
                material.wireframe = true;
                simplified.material.wireframe = true;
            } else {
                material.wireframe = false;
                simplified.material.wireframe = false;
            }
        });

    const resize_scale = gui
        .add(control, "scale", 1, 10)
        .name("大小")
        .listen()
        .onChange(function (value) {
            mesh.scale.set(value, value, value);
            simplified.scale.set(value, value, value);
        });

    const light_intensity = gui
        .add(control, "intensity", 0, 10)
        .name("亮度")
        .listen()
        .onChange(function (value) {
            light1.intensity = value;
            light2.intensity = value;
        });

    const helpers = new THREE.Group();
    helpers.add(new THREE.PlaneHelper(clipPlanes[0], 11, 0xff0000));
    helpers.add(new THREE.PlaneHelper(clipPlanes[1], 11, 0x00ff00));
    helpers.add(new THREE.PlaneHelper(clipPlanes[2], 11, 0x0000ff));
    scene.add(helpers);
    helpers.visible = false;

    gui.add(control, "helpers")
        .name("輔助線")
        .listen()
        .onChange(function (value) {
            helpers.visible = value;
        });

    gui.add(control, "clipIntersection")
        .name("交集/差集")
        .onChange(function (value) {
            mesh.material.clipIntersection = value;
        });

    gui.add(control, "planeConstant", -5.5, 5.5)
        .step(0.1)
        .name("模型裁切相交點")
        .onChange(function (value) {
            for (let j = 0; j < clipPlanes.length; j++) {
                clipPlanes[j].constant = value;
            }
        });

    const bvhGeometry = geometry.clone();
    bvhGeometry.computeBoundsTree();
    const bvhMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const bvhMesh = new THREE.Mesh(bvhGeometry, bvhMaterial);
    bvhMesh.rotation.set(4.5, 0, 1);
    helper = new MeshBVHVisualizer(bvhMesh, control.helperDepth);
    helper.color.set(0xe91e63);
    helper.visible = false;
    scene.add(helper);

    gui.add(control, "displayhelper")
        .name("BVH輔助線")
        .onChange(function (value) {
            helper.visible = value;
        });

    gui.add(control, "helperDepth", 1, 20, 1)
        .step(1)
        .name("輔助線深度")
        .onChange(function (value) {
            helper.depth = parseInt(value);
            helper.update();
        });

    let raycaster = new THREE.Raycaster();
    const intersection = {
        intersects: false,
        point: new THREE.Vector3(),
        normal: new THREE.Vector3()
    };
    const intersects = [];
    const mouse = new THREE.Vector2();

    const mouseHelper = new THREE.Mesh(
        new THREE.BoxGeometry(0.01, 0.01, 10),
        new THREE.MeshBasicMaterial()
    );
    mouseHelper.visible = true;
    scene.add(mouseHelper);

    window.addEventListener("pointermove", onPointerMove);

    function onPointerMove(event) {
        if (event.isPrimary !== false && event.isPrimary !== undefined) {
            checkIntersection(event.clientX, event.clientY);
        } else if (event.isPrimary === undefined) {
            // 有些瀏覽器沒有 isPrimary，就單純處理
            checkIntersection(event.clientX, event.clientY);
        }
    }

    function checkIntersection(x, y) {
        if (mesh === undefined) return;
        mouse.x = (x / window.innerWidth) * 2 - 1;
        mouse.y = -(y / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        raycaster.intersectObject(mesh, false, intersects);
        if (intersects.length > 0) {
            const p = intersects[0].point;
            mouseHelper.position.copy(p);
            intersection.point.copy(p);
            const n = intersects[0].face.normal.clone();
            n.transformDirection(mesh.matrixWorld);
            n.multiplyScalar(10);
            n.add(intersects[0].point);
            intersection.normal.copy(intersects[0].face.normal);
            mouseHelper.lookAt(n);
            intersection.intersects = true;
            intersects.length = 0;
        } else {
            intersection.intersects = false;
        }
    }

    window.addEventListener("resize", onWindowResize);

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
