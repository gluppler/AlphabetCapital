uniform float uTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uFresnelPower;
uniform float uFresnelScale;
varying vec2 vUv;
uniform float uOpacity;
uniform float uIntensity;

vec2 fade(vec2 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }
vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float perlinNoise(vec2 P) {
    vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
    vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
    Pi = mod(Pi, 289.0);
    vec4 ix = Pi.xzxz;
    vec4 iy = Pi.yyww;
    vec4 fx = Pf.xzxz;
    vec4 fy = Pf.yyww;
    vec4 i = permute(permute(ix) + iy);
    vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0;
    vec4 gy = abs(gx) - 0.5;
    vec4 tx = floor(gx + 0.5);
    gx = gx - tx;
    vec2 g00 = vec2(gx.x, gy.x);
    vec2 g10 = vec2(gx.y, gy.y);
    vec2 g01 = vec2(gx.z, gy.z);
    vec2 g11 = vec2(gx.w, gy.w);
    vec4 norm = 1.79284291400159 - 0.85373472095314 *
        vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
    g00 *= norm.x;
    g01 *= norm.y;
    g10 *= norm.z;
    g11 *= norm.w;
    float n00 = dot(g00, vec2(fx.x, fy.x));
    float n10 = dot(g10, vec2(fx.y, fy.y));
    float n01 = dot(g01, vec2(fx.z, fy.z));
    float n11 = dot(g11, vec2(fx.w, fy.w));
    vec2 fade_xy = fade(Pf.xy);
    vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
    float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
    return 2.3 * n_xy;
}

void main() {
    vec2 uv = vUv;

    // Flow direction: top to bottom
    float flow1 = perlinNoise(vec2(uv.x * 3.0, uv.y * 0.8 - uTime * 0.2));
    float flow2 = perlinNoise(vec2(uv.x * 5.0 + 2.0, uv.y * 1.2 - uTime * 0.35));
    float flow3 = perlinNoise(vec2(uv.x * 8.0 + 5.0, uv.y * 1.5 - uTime * 0.5));

    flow1 = flow1 * 0.5 + 0.5;
    flow2 = flow2 * 0.5 + 0.5;
    flow3 = flow3 * 0.5 + 0.5;

    // Lateral ripple — slight x wobble like water hitting rocks
    float ripple = perlinNoise(vec2(uv.x * 6.0 - uTime * 0.1, uv.y * 2.0 - uTime * 0.3)) * 0.03;

    vec3 color = mix(uColor1, uColor2, flow1);
    color = mix(color, uColor3, flow2 * 0.4);
    color += flow3 * 0.08;
    // color += ripple;

    vec2 center = vUv - vec2(0.5, 1.0);
    float dist = length(center);
    float circle = 1.1 + smoothstep(0.2, 0.3, dist);
    float edgeFade = smoothstep(0.0, 0.2, vUv.x) 
        * smoothstep(1.0, 0.85, vUv.x) 
        * smoothstep(0.0, 0.5, vUv.y) 
        * smoothstep(1.0, 0.8, vUv.y);
    float alpha = circle * edgeFade;

    vec3 dither = vec3(fract(sin(dot(vUv * 1000.0, vec2(12.9898, 78.233))) * 43758.5453));
    color += (dither - 0.5) / 100.0;

    gl_FragColor = vec4(color * 1.05, alpha * uOpacity);
}
