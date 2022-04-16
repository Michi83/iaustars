// A visualization of IAU-approved star names, see:
// https://www.iau.org/public/themes/naming_stars/
//
// Common symbols:
// lambda: right ascension
// phi: declination
// lambda0, phi0: center of projection

let asin = Math.asin
let atan2 = Math.atan2
let canvas = document.getElementById("main-canvas")
let context = canvas.getContext("2d")
let cos = Math.cos
let lambda0
let lambda0Degrees = 0
let phi0
let phi0Degrees = 0
let projection
let rad = (x) => {return tau / 360 * x} // degrees to radians
let sin = Math.sin
let tan = Math.tan
let tau = 2 * Math.PI
let zoom = 1

let draw = () => {
    canvas.height = window.innerHeight
    canvas.width = window.innerWidth
    document.getElementById("lambda0").textContent = lambda0Degrees
    document.getElementById("phi0").textContent = phi0Degrees
    document.getElementById("zoom").textContent = zoom
    lambda0 = rad(lambda0Degrees)
    phi0 = rad(phi0Degrees)
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = "#000000"
    context.fillRect(0, 0, canvas.width, canvas.height)
    for (let i = 0; i < 360; i += 30) {
        let lambda = rad(i)
        drawLongitude(lambda)
    }
    for (let i = -90; i <= 90; i += 30) {
        let phi = rad(i)
        context.lineWidth = i === 0 ? 2 : 1
        drawLatitude(phi)
    }
    context.lineWidth = 2
    drawEcliptic()
    context.lineWidth = 1
    for (let star of stars) {
        drawStar(star)
    }
    for (let object of specialObjects) {
        drawSpecialObject(object)
    }
}

let drawEcliptic = () => {
    let points = []
    for (let i = 0; i <= 360; i++) {
        let lambda = rad(i)
        let phi = 0
        ;[lambda, phi] = rotateX(lambda, phi, rad(23.4))
        let [lambdaPrime, phiPrime] = transform(lambda, phi, lambda0, phi0)
        let r
        ;[lambdaPrime, r] = projection(lambdaPrime, phiPrime)
        r *= 500 * zoom
        let [x, y, z] = toCartesian(lambdaPrime, 0, r)
        ;[x, y] = [canvas.width / 2 - y, canvas.height / 2 + x]
        points.push([x, y])
    }
    context.strokeStyle = "#FF0000"
    drawLines(points)
}

let drawLatitude = (phi) => {
    let points = []
    for (let i = 0; i <= 360; i++) {
        let lambda = rad(i)
        let [lambdaPrime, phiPrime] = transform(lambda, phi, lambda0, phi0)
        let r
        ;[lambdaPrime, r] = projection(lambdaPrime, phiPrime)
        r *= 500 * zoom
        let [x, y, z] = toCartesian(lambdaPrime, 0, r)
        ;[x, y] = [canvas.width / 2 - y, canvas.height / 2 + x]
        points.push([x, y])
    }
    context.strokeStyle = "#0000FF"
    drawLines(points)
}

// Draws lines between an array of points.
let drawLines = (points) => {
    for (let i = 0; i < points.length - 1; i++) {
        let [x1, y1] = points[i]
        let [x2, y2] = points[i + 1]
        let deltaX = x1 - x2
        let deltaY = y1 - y2
        let distanceSquared = deltaX * deltaX + deltaY * deltaY
        if (distanceSquared > 10000) {
            // We don't draw a line if points are more than 100 pixels apart,
            // assuming there is some kind of rounding error or something.
            continue
        }
        context.beginPath()
        context.moveTo(x1, y1)
        context.lineTo(x2, y2)
        context.stroke()
    }
}

let drawLongitude = (lambda) => {
    let points = []
    for (let i = -90; i <= 90; i++) {
        let phi = rad(i)
        let [lambdaPrime, phiPrime] = transform(lambda, phi, lambda0, phi0)
        let r
        ;[lambdaPrime, r] = projection(lambdaPrime, phiPrime)
        r *= 500 * zoom
        let [x, y, z] = toCartesian(lambdaPrime, 0, r)
        ;[x, y] = [canvas.width / 2 - y, canvas.height / 2 + x]
        points.push([x, y])
    }
    context.strokeStyle = "#0000FF"
    drawLines(points)
}

let drawSpecialObject = (object) => {
    let lambda = rad(object.rightAscension)
    let phi = rad(object.declination)
    let [lambdaPrime, phiPrime] = transform(lambda, phi, lambda0, phi0)
    let r
    ;[lambdaPrime, r] = projection(lambdaPrime, phiPrime)
    r *= 500 * zoom
    let [x, y, z] = toCartesian(lambdaPrime, 0, r)
    ;[x, y] = [canvas.width / 2 - y, canvas.height / 2 + x]
    context.fillStyle = "#FFFFFF"
    context.strokeStyle = "#FFFFFF"
    context.beginPath()
    context.moveTo(x - 5, y)
    context.lineTo(x + 5, y)
    context.stroke()
    context.beginPath()
    context.moveTo(x, y - 5)
    context.lineTo(x, y + 5)
    context.stroke()
    context.fillText(object.name, x, y)
}

let drawStar = (star) => {
    let lambda = rad(15 * star.rightAscension)
    let phi = rad(star.declination)
    let magnitude = 6.5 - star.magnitude
    let [lambdaPrime, phiPrime] = transform(lambda, phi, lambda0, phi0)
    let r
    ;[lambdaPrime, r] = projection(lambdaPrime, phiPrime)
    r *= 500 * zoom
    let [x, y, z] = toCartesian(lambdaPrime, 0, r)
    ;[x, y] = [canvas.width / 2 - y, canvas.height / 2 + x]
    let gradient
    try {
        gradient = context.createRadialGradient(x, y, 0, x, y, magnitude)
    } catch {
        return
    }
    gradient.addColorStop(0.45, "#FFFFFF")
    gradient.addColorStop(0.55, star.color)
    gradient.addColorStop(1, "#000000")
    context.fillStyle = gradient
    context.beginPath()
    context.arc(x, y, magnitude, 0, tau)
    context.fill()
    let name = names[star.number]
    if (name === undefined) {
        return
    }
    context.fillStyle = "#FFFFFF"
    context.fillText(name, x, y)
}

// The projection functions all assume that the north pole is the center of
// projection. For a different center of projection coordinates must be
// transformed first, see function transform.

let projectEquidistant = (lambda, phi) => {
    let r = tau / 4 - phi
    return [lambda, r]
}

let projectGnomonic = (lambda, phi) => {
    if (phi < 0) {
        // For gnomonic and orthographic projection only the northern hemisphere
        // is projected to avoid weird "mirror images".
        return [NaN, NaN]
    }
    let r = 1 / tan(phi)
    return [lambda, r]
}

let projectLambert = (lambda, phi) => {
    let r = 2 * sin((tau / 4 - phi) / 2)
    return [lambda, r]
}

let projectOrthographic = (lambda, phi) => {
    if (phi < 0) {
        return [NaN, NaN]
    }
    let r = cos(phi)
    return [lambda, r]
}

let projectStereographic = (lambda, phi) => {
    let r = 2 * tan((tau / 4 - phi) / 2)
    return [lambda, r]
}

// Axes for the rotation functions are defined as follows:
// - The x axis points to 0h RA, 0° Dec.
// - The y axis points to 6h RA, 0° Dec.
// - The z axis points to 0h RA, 90° Dec.

let rotateX = (lambda, phi, theta) => {
    let lambdaPrime = atan2(
        sin(lambda) * cos(phi) * cos(theta) - sin(phi) * sin(theta),
        cos(lambda) * cos(phi)
    )
    let phiPrime = asin(
        sin(lambda) * cos(phi) * sin(theta) + sin(phi) * cos(theta)
    )
    return [lambdaPrime, phiPrime]
}

let rotateY = (lambda, phi, theta) => {
    let lambdaPrime = atan2(
        sin(lambda) * cos(phi),
        cos(lambda) * cos(phi) * cos(theta) + sin(phi) * sin(theta)
    )
    let phiPrime = asin(
        sin(phi) * cos(theta) - cos(lambda) * cos(phi) * sin(theta)
    )
    return [lambdaPrime, phiPrime]
}

let rotateZ = (lambda, phi, theta) => {
    return [lambda + theta, phi]
}

let toCartesian = (lambda, phi, r) => {
    let x = r * cos(lambda) * cos(phi)
    let y = r * sin(lambda) * cos(phi)
    let z = r * sin(phi)
    return [x, y, z]
}

// Transforms coordinates lambda and phi to a different coordinate system where
// lambda0, phi0 is the north pole.
let transform = (lambda, phi, lambda0, phi0) => {
    ;[lambda, phi] = rotateZ(lambda, phi, -lambda0)
    ;[lambda, phi] = rotateY(lambda, phi, phi0 - tau / 4)
    return [lambda, phi]
}

document.addEventListener(
    "keydown",
    (event) => {
        if (event.code === "ArrowDown") {
            phi0Degrees--
            draw()
        } else if (event.code === "ArrowLeft") {
            lambda0Degrees++
            draw()
        } else if (event.code === "ArrowRight") {
            lambda0Degrees--
            draw()
        } else if (event.code === "ArrowUp") {
            phi0Degrees++
            draw()
        } else if (event.code === "KeyE") {
            projection = projectEquidistant
            document.getElementById("projection").textContent = "equidistant"
            draw()
        } else if (event.code === "KeyG") {
            projection = projectGnomonic
            document.getElementById("projection").textContent = "gnomonic"
            draw()
        } else if (event.code === "KeyL") {
            projection = projectLambert
            document.getElementById("projection").textContent = "lambert"
            draw()
        } else if (event.code === "KeyO") {
            projection = projectOrthographic
            document.getElementById("projection").textContent = "orthographic"
            draw()
        } else if (event.code === "KeyS") {
            projection = projectStereographic
            document.getElementById("projection").textContent = "stereographic"
            draw()
        } else if (event.code === "PageDown") {
            zoom--
            draw()
        } else if (event.code === "PageUp") {
            zoom++
            draw()
        }
    }
)

window.addEventListener("resize", draw)
context.globalCompositeOperation = "lighter"
projection = projectEquidistant
document.getElementById("projection").textContent = "equidistant"
draw()
