/** HD-перерисовки готовых зданий. Композиция — по изображениям Mega Drive, двор — вариант владельца. */
import palace from "./assets/palace.png?url";
import vehicleFactory from "./assets/vehicle-factory-transparent.png?url";
import hightechFactory from "./assets/hightech-factory.png?url";
import barracks from "./assets/barracks.png?url";
import constructionYard from "./assets/construction-yard.png?url";
import windtrap from "./assets/windtrap.png?url";
import starport from "./assets/starport.png?url";
import refinery from "./assets/refinery-transparent.png?url";
import repairFacility from "./assets/repair-facility.png?url";
import turret from "./assets/turret-directions-transparent.png?url";
import rocketTurret from "./assets/rocket-turret-directions-transparent.png?url";
import spiceSilo from "./assets/spice-silo-transparent.png?url";
import radarOutpost from "./assets/radar-base.png?url";
import radarDish from "./assets/radar-dish.png?url";
import dronePad from './assets/drone-pad.png?url';

export interface StructureArt {
  type: number;
  url: string;
  /** Башни: восемь направлений в атласе 4×2, начиная с севера по часовой стрелке. */
  directions?: boolean;
  /** Visual registration inside the unchanged logical footprint, normalized to the canvas. */
  align?: {x:number;y:number};
  layerUrl?:string;
}

// В MD у лёгкого и тяжёлого заводов одна картинка; у казарм и WOR — тоже.
// Дом IX (6) недоступен и не имеет готовой графики в этом ROM; бетон и стены — клетки карты.
export const STRUCTURE_ART: readonly StructureArt[] = [
  { type: 2, url: palace },
  { type: 3, url: vehicleFactory },
  { type: 4, url: vehicleFactory },
  { type: 5, url: hightechFactory },
  { type: 7, url: barracks },
  { type: 8, url: constructionYard },
  { type: 9, url: windtrap },
  { type: 10, url: barracks },
  { type: 11, url: starport },
  { type: 12, url: refinery },
  { type: 13, url: repairFacility },
  { type: 15, url: turret, directions: true },
  { type: 16, url: rocketTurret, directions: true },
  { type: 17, url: spiceSilo, align:{x:42/1254,y:7/1254} },
  { type: 18, url: radarOutpost, layerUrl:radarDish },
  { type: 19, url: dronePad },
];
