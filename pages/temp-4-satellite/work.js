import {
  eciToEcf,
  EciVec3,
  gstime,
  propagate,
  twoline2satrec,
  sgp4,
  SatRec
} from 'satellite.js'

function jday(year, month, day, hr, minute, sec) {
  return (
    367.0 * year -
    Math.floor(7 * (year + Math.floor((month + 9) / 12.0)) * 0.25) +
    Math.floor((275 * month) / 9.0) +
    day +
    1721013.5 +
    ((sec / 60.0 + minute) / 60.0 + hr) / 24.0
  )
}

function calcPositions(tle) {
  const satCache = []
  Object.values(tle).forEach((i) => {
    const satrec = twoline2satrec(i.tle[1], i.tle[2])
    satCache.push(satrec)
  })

  const satPos = new Float32Array(satCache.length * 3)
  const satVel = new Float32Array(satCache.length * 3)

  var now = new Date()
  var j = jday(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds()
  )
  j += now.getUTCMilliseconds() * 1.15741e-8 //days per millisecond

  for (let i = 0; i < satCache.length; i++) {
    const m = (j - satCache[i].jdsatepoch) * 1440.0
    // const pv = sgp4(satCache[i], m)
    const pv = propagate(satCache[i], new Date())
    let x = 0,
      y = 0,
      z = 0,
      vx = 0,
      vy = 0,
      vz = 0

    if (pv) {
      x = pv.position ? pv.position.x : 0
      y = pv.position ? pv.position.y : 0
      z = pv.position ? pv.position.z : 0
      vx = pv.velocity ? pv.velocity.x : 0
      vy = pv.velocity ? pv.velocity.y : 0
      vz = pv.velocity ? pv.velocity.z : 0
    }

    satPos[i * 3] = x / 1000
    satPos[i * 3 + 1] = y / 1000
    satPos[i * 3 + 2] = z / 1000

    satVel[i * 3] = vx / 1000
    satVel[i * 3 + 1] = vy / 1000
    satVel[i * 3 + 2] = vz / 1000
  }

  return {
    satPos,
    satVel,
    satCache
  }
}

self.onmessage = (event) => {
  const { tle } = event.data

  console.log('calc', tle)
  const { satPos } = calcPositions(tle)
  self.postMessage({ position: satPos })
}
