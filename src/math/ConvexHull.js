import { LineSegment } from './LineSegment.js';
import { Plane } from './Plane.js';
import { Vector3 } from './Vector3.js';
import { Logger } from '../core/Logger.js';
import { Polygon } from '../navigation/navmesh/Polygon.js';

const line = new LineSegment();
const plane = new Plane();
const closestPoint = new Vector3();

const VISIBLE = 0;
const DELETED = 1;
// const MERGED = 2;

/**
* Class representing a convex hull. This is an implementation of the Quickhull algorithm
* based on the presentation {@link http://media.steampowered.com/apps/valve/2014/DirkGregorius_ImplementingQuickHull.pdf Implementing QuickHull}
* by Dirk Gregorius (Valve Software) from GDC 2014. The algorithm has an average runtime
* complexity of O(n*log(n)), whereas in the worst case it takes O(n²).
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class ConvexHull {

	/**
	* Constructs a new convex hull.
	*/
	constructor() {

		/**
		* An array of faces representing the convex hull.
		* @type Array
		*/
		this.faces = new Array();

		// private members

		// tolerance value for various (float) compare operations

		this._tolerance = - 1;

		// this array represents the vertices which will be enclosed by the convex hull

		this._vertices = new Array();

		// two doubly linked lists for easier vertex processing

		this._assigned = new VertexList();
		this._unassigned = new VertexList();

		// this array holds the new faces generated in a single iteration of the algorithm

		this._newFaces = new Array();

	}

	/**
	* Sets the given faces to this convex hull.
	*
	* @param {Array} faces - The new faces of the convex hull.
	* @return {ConvexHull} A reference to this convex hull.
	*/
	set( faces ) {

		this.faces = faces;

		return this;

	}

	/**
	* Copies the faces from the given convex hull to this convex hull.
	*
	* @param {ConvexHull} convexHull - The convex hull to copy.
	* @return {ConvexHull} A reference to this convex hull.
	*/
	copy( convexHull ) {

		this.faces.length = 0;
		this.faces.push( ...convexHull.faces );

		return this;

	}

	/**
	* Creates a new convex hull and copies all values from this convex hull.
	*
	* @return {ConvexHull} A new convex hull.
	*/
	clone() {

		return new this.constructor().copy( this );

	}

	/**
	* Returns true if the given point is inside this convex hull.
	*
	* @param {Vector3} point - A point in 3D space.
	* @return {Boolean} Whether the given point is inside this convex hull or not.
	*/
	containsPoint( point ) {

		const faces = this.faces;

		// use the internal plane abstraction of each face in order to test
		// on what half space the point lies

		for ( let i = 0, l = faces.length; i < l; i ++ ) {

			// if the signed distance is greater zero, the point is outside and
			// we can stop the processing

			if ( faces[ i ].distanceToPoint( point ) > this._tolerance ) return false;

		}

		return true;

	}

	/**
	* Computes a convex hull that encloses the given set of points. The computation requires
	* at least four points.
	*
	* @param {Array} points - An array of 3D vectors representing points in 3D space.
	* @return {ConvexHull} A reference to this convex hull.
	*/
	fromPoints( points ) {

		if ( points.length < 4 ) {

			Logger.error( 'YUKA.ConvexHull: The given points array needs at least four points.' );
			return this;

		}

		// wrap all points into the internal vertex data structure

		for ( let i = 0, l = points.length; i < l; i ++ ) {

			this._vertices.push( new Vertex( points[ i ] ) );

		}

		// generate the convex hull

		this._generate();

		return this;

	}

	// private API

		// adds a single face to the convex hull by connecting it with the respective horizon edge

	_addAdjoiningFace( vertex, horizonEdge ) {

		// all the half edges are created in ccw order thus the face is always pointing outside the hull

		const face = new Face( vertex.point, horizonEdge.prev.vertex, horizonEdge.vertex );

		this.faces.push( face );

		// join face.getEdge( - 1 ) with the horizon's opposite edge face.getEdge( - 1 ) = face.getEdge( 2 )

		face.getEdge( - 1 ).linkOpponent( horizonEdge.twin );

		return face.getEdge( 0 ); // the half edge whose vertex is the given one

	}

	// adds new faces by connecting the horizon with the new point of the convex hull

	_addNewFaces( vertex, horizon ) {

		this._newFaces = [];

		let firstSideEdge = null;
		let previousSideEdge = null;

		for ( let i = 0, l = horizon.length; i < l; i ++ ) {

			// returns the right side edge

			let sideEdge = this._addAdjoiningFace( vertex, horizon[ i ] );

			if ( firstSideEdge === null ) {

				firstSideEdge = sideEdge;

			} else {

				// joins face.getEdge( 1 ) with previousFace.getEdge( 0 )

				sideEdge.next.linkOpponent( previousSideEdge );

			}

			this._newFaces.push( sideEdge.polygon );
			previousSideEdge = sideEdge;

		}

		// perform final join of new faces

		firstSideEdge.next.linkOpponent( previousSideEdge );

		return this;

	}

	// assigns a single vertex to the given face. that means this face can "see"
	// the vertex and its distance to the vertex is greater than all other faces

	_addVertexToFace( vertex, face ) {

		vertex.face = face;

		if ( face.outside === null ) {

			this._assigned.append( vertex );

			face.outside = vertex;

		} else {

			this._assigned.insertAfter( face.outside, vertex );

		}

		return this;

	}

	// the base iteration of the algorithm. adds a new vertex to the convex hull by
	// connecting faces from the horizon with it.

	_addVertexToHull( vertex ) {

		const horizon = [];

		this._unassigned.clear();

		this._computeHorizon( vertex.point, null, vertex.face, horizon );

		this._addNewFaces( vertex, horizon );

		// reassign 'unassigned' vertices to the new faces

		this._resolveUnassignedPoints( this._newFaces );

		return this;

	}

	// frees memory by resetting internal data structures

	_reset() {

		this._vertices.length = 0;

		this._assigned.clear();
		this._unassigned.clear();

		this._newFaces.length = 0;

		return this;

	}

	// computes the initial hull of the algorithm. it's a tetrahedron created
	// with the extreme vertices of the given set of points

	_computeInitialHull() {

		let v0, v1, v2, v3;

		const vertices = this._vertices;
		const extremes = this._computeExtremes();
		const min = extremes.min;
		const max = extremes.max;

		// 1. Find the two points 'p0' and 'p1' with the greatest 1d separation
		// (max.x - min.x)
		// (max.y - min.y)
		// (max.z - min.z)

		// check x

		let distance, maxDistance;

		distance = maxDistance = max.x.point.x - min.x.point.x;

		v0 = min.x;
		v1 = max.x;

		// check y

		distance = max.y.point.y - min.y.point.y;

		if ( distance > maxDistance ) {

			v0 = min.y;
			v1 = max.y;

			maxDistance = distance;

		}

		// check z

		distance = max.z.point.z - min.z.point.z;

		if ( distance > maxDistance ) {

			v0 = min.z;
			v1 = max.z;

		}

		// 2. The next vertex 'v2' is the one farthest to the line formed by 'v0' and 'v1'

		maxDistance = - Infinity;
		line.set( v0.point, v1.point );

		for ( let i = 0, l = vertices.length; i < l; i ++ ) {

			const vertex = vertices[ i ];

			if ( vertex !== v0 && vertex !== v1 ) {

				line.closestPointToPoint( vertex.point, true, closestPoint );

				distance = closestPoint.squaredDistanceTo( vertex.point );

				if ( distance > maxDistance ) {

					maxDistance = distance;
					v2 = vertex;

				}

			}

		}

		// 3. The next vertex 'v3' is the one farthest to the plane 'v0', 'v1', 'v2'

		maxDistance = - Infinity;
		plane.fromCoplanarPoints( v0.point, v1.point, v2.point );

		for ( let i = 0, l = vertices.length; i < l; i ++ ) {

			const vertex = vertices[ i ];

			if ( vertex !== v0 && vertex !== v1 && vertex !== v2 ) {

				distance = Math.abs( plane.distanceToPoint( vertex.point ) );

				if ( distance > maxDistance ) {

					maxDistance = distance;
					v3 = vertex;

				}

			}

		}

		const faces = this.faces;

		if ( plane.distanceToPoint( v3.point ) < 0 ) {

			// the face is not able to see the point so 'plane.normal' is pointing outside the tetrahedron

			faces.push(
				new Face( v0.point, v1.point, v2.point ),
				new Face( v3.point, v1.point, v0.point ),
				new Face( v3.point, v2.point, v1.point ),
				new Face( v3.point, v0.point, v2.point )
			);

			// set the twin edge

			// join face[ i ] i > 0, with the first face

			faces[ 1 ].getEdge( 2 ).linkOpponent( faces[ 0 ].getEdge( 1 ) );
			faces[ 2 ].getEdge( 2 ).linkOpponent( faces[ 0 ].getEdge( 2 ) );
			faces[ 3 ].getEdge( 2 ).linkOpponent( faces[ 0 ].getEdge( 0 ) );

			// join face[ i ] with face[ i + 1 ], 1 <= i <= 3

			faces[ 1 ].getEdge( 1 ).linkOpponent( faces[ 2 ].getEdge( 0 ) );
			faces[ 2 ].getEdge( 1 ).linkOpponent( faces[ 3 ].getEdge( 0 ) );
			faces[ 3 ].getEdge( 1 ).linkOpponent( faces[ 1 ].getEdge( 0 ) );

		} else {

			// the face is able to see the point so 'plane.normal' is pointing inside the tetrahedron

			faces.push(
				new Face( v0.point, v2.point, v1.point ),
				new Face( v3.point, v0.point, v1.point ),
				new Face( v3.point, v1.point, v2.point ),
				new Face( v3.point, v2.point, v0.point )
			);

			// set the twin edge

			// join face[ i ] i > 0, with the first face

			faces[ 1 ].getEdge( 2 ).linkOpponent( faces[ 0 ].getEdge( 0 ) );
			faces[ 2 ].getEdge( 2 ).linkOpponent( faces[ 0 ].getEdge( 2 ) );
			faces[ 3 ].getEdge( 2 ).linkOpponent( faces[ 0 ].getEdge( 1 ) );

			// join face[ i ] with face[ i + 1 ], 1 <= i <= 3

			faces[ 1 ].getEdge( 0 ).linkOpponent( faces[ 2 ].getEdge( 1 ) );
			faces[ 2 ].getEdge( 0 ).linkOpponent( faces[ 3 ].getEdge( 1 ) );
			faces[ 3 ].getEdge( 0 ).linkOpponent( faces[ 1 ].getEdge( 1 ) );

		}

		// initial assignment of vertices to the faces of the tetrahedron

		for ( let i = 0, l = vertices.length; i < l; i ++ ) {

			const vertex = vertices[ i ];

			if ( vertex !== v0 && vertex !== v1 && vertex !== v2 && vertex !== v3 ) {

				maxDistance = this._tolerance;
				let maxFace = null;

				for ( let j = 0; j < 4; j ++ ) {

					distance = faces[ j ].distanceToPoint( vertex.point );

					if ( distance > maxDistance ) {

						maxDistance = distance;
						maxFace = faces[ j ];

					}

				}

				if ( maxFace !== null ) {

					this._addVertexToFace( vertex, maxFace );

				}

			}

		}

		return this;

	}

	// computes the extreme vertices of used to compute the inital convex hull

	_computeExtremes() {

		const min = new Vector3( Infinity, Infinity, Infinity );
		const max = new Vector3( - Infinity, - Infinity, - Infinity );

		const minVertices = { x: null, y: null, z: null };
		const maxVertices = { x: null, y: null, z: null };

		// compute the min/max points on all six directions

		for ( let i = 0, l = this._vertices.length; i < l; i ++ ) {

			const vertex = this._vertices[ i ];
			const point = vertex.point;

			// update the min coordinates

			if ( point.x < min.x ) {

				min.x = point.x;
				minVertices.x = vertex;

			}

			if ( point.y < min.y ) {

				min.y = point.y;
				minVertices.y = vertex;

			}

			if ( point.z < min.z ) {

				min.z = point.z;
				minVertices.z = vertex;

			}

			// update the max coordinates

			if ( point.x > max.x ) {

				max.x = point.x;
				maxVertices.x = vertex;

			}

			if ( point.y > max.y ) {

				max.y = point.y;
				maxVertices.y = vertex;

			}

			if ( point.z > max.z ) {

				max.z = point.z;
				maxVertices.z = vertex;

			}

		}

		// use min/max vectors to compute an optimal epsilon

		this._tolerance = 3 * Number.EPSILON * (
			Math.max( Math.abs( min.x ), Math.abs( max.x ) ) +
			Math.max( Math.abs( min.y ), Math.abs( max.y ) ) +
			Math.max( Math.abs( min.z ), Math.abs( max.z ) )
		);

		return { min: minVertices, max: maxVertices };

	}

	// computes the horizon, an array of edges enclosing the faces that are able
	// to see the new vertex

	_computeHorizon( eyePoint, crossEdge, face, horizon ) {

		if ( face.outside ) {

			const startVertex = face.outside;

			// remove all vertices from the given face

			this._removeAllVerticesFromFace( face );

			// mark the face vertices to be reassigned to other faces

			this._unassigned.appendChain( startVertex );

		}

		face.flag = DELETED;

		let edge;

		if ( crossEdge === null ) {

			edge = crossEdge = face.getEdge( 0 );

		} else {

			// start from the next edge since 'crossEdge' was already analyzed
			// (actually 'crossEdge.twin' was the edge who called this method recursively)

			edge = crossEdge.next;

		}

		do {

			let twinEdge = edge.twin;
			let oppositeFace = twinEdge.polygon;

			if ( oppositeFace.flag === VISIBLE ) {

				if ( oppositeFace.distanceToPoint( eyePoint ) > this._tolerance ) {

					// the opposite face can see the vertex, so proceed with next edge

					this._computeHorizon( eyePoint, twinEdge, oppositeFace, horizon );

				} else {

					// the opposite face can't see the vertex, so this edge is part of the horizon

					horizon.push( edge );

				}

			}

			edge = edge.next;

		} while ( edge !== crossEdge );

		return this;

	}

	// this method controls the basic flow of the algorithm

	_generate() {

		this.faces.length = 0;

		this._computeInitialHull();

		let vertex;

		while ( vertex = this._nextVertexToAdd() ) {

			this._addVertexToHull( vertex );

		}

		this._updateFaces();

		this._reset();

		return this;

	}

	// determines the next vertex that should added to the convex hull

	_nextVertexToAdd() {

		let nextVertex = null;

		// if the 'assigned' list of vertices is empty, no vertices are left

		if ( this._assigned.empty() === false ) {

			let maxDistance = 0;

			// grap the first available vertex and save the respective face

			let vertex = this._assigned.first();
			const face = vertex.face;

			// now calculate the farthest vertex that face can see

			do {

				const distance = face.distanceToPoint( vertex.point );

				if ( distance > maxDistance ) {

					maxDistance = distance;
					nextVertex = vertex;

				}

				vertex = vertex.next;

			} while ( vertex !== null && vertex.face === face );

		}

		return nextVertex;

	}

	// updates the faces array after the computation of the convex hull
	// it ensures only visible faces are in the result set

	_updateFaces() {

		const faces = this.faces;
		const activeFaces = new Array();

		for ( let i = 0, l = faces.length; i < l; i ++ ) {

			const face = faces[ i ];

			// only respect visible but not deleted or merged faces

			if ( face.flag === VISIBLE ) {

				activeFaces.push( face );

			}

		}

		this.faces.length = 0;
		this.faces.push( ...activeFaces );

		return this;

	}

	// removes all vertices from the given face. necessary when deleting a face
	// which is necessary when the hull is going to be expanded

	_removeAllVerticesFromFace( face ) {

		if ( face.outside !== null ) {

			// reference to the first and last vertex of this face

			const firstVertex = face.outside;
			firstVertex.face = null;

			let lastVertex = face.outside;

			while ( lastVertex.next !== null && lastVertex.next.face === face ) {

				lastVertex = lastVertex.next;
				lastVertex.face = null;

			}

			face.outside = null;

			this._assigned.removeChain( firstVertex, lastVertex );

		}

		return this;

	}

	// removes a single vertex from the given face

	_removeVertexFromFace( vertex, face ) {

		vertex.face = null;

		if ( vertex === face.outside ) {

			// fix face.outside link

			if ( vertex.next !== null && vertex.next.face === face ) {

				// face has at least 2 outside vertices, move the 'outside' reference

				face.outside = vertex.next;

			} else {

				// vertex was the only outside vertex that face had

				face.outside = null;

			}

		}

		this._assigned.remove( vertex );

		return this;

	}

	// ensure that all unassigned points are reassigned to other faces of the
	// current convex hull. this method is always executed after the hull was
	// expanded

	_resolveUnassignedPoints( newFaces ) {

		if ( this._unassigned.empty() === false ) {

			let vertex = this._unassigned.first();

			do {

				// buffer 'next' reference since addVertexToFace() can change it

				let nextVertex = vertex.next;
				let maxDistance = this._tolerance;

				let maxFace = null;

				for ( let i = 0, l = newFaces.length; i < l; i ++ ) {

					const face = newFaces[ i ];

					if ( face.flag === VISIBLE ) {

						const distance = face.distanceToPoint( vertex.point );

						if ( distance > maxDistance ) {

							maxDistance = distance;
							maxFace = face;

						}

					}

				}

				if ( maxFace !== null ) {

					this._addVertexToFace( vertex, maxFace );

				}

				vertex = nextVertex;

			} while ( vertex !== null );

		}

		return this;

	}

}

class Face extends Polygon {

	constructor( a = new Vector3(), b = new Vector3(), c = new Vector3() ) {

		super();

		this.outside = null; // reference to a vertex in a vertex list this face can see
		this.flag = VISIBLE;

		this.fromContour( [ a, b, c ] );

		this.computeCentroid();

	}

	getEdge( i ) {

		let edge = this.edge;

		while ( i > 0 ) {

			edge = edge.next;
			i --;

		}

		while ( i < 0 ) {

			edge = edge.prev;
			i ++;

		}

		return edge;

	}

}

// special data structures for the quick hull implementation

class Vertex {

	constructor( point = new Vector3() ) {

		this.point = point;
		this.prev = null;
		this.next = null;
		this.face = null; // the face that is able to see this vertex

	}

}

class VertexList {

	constructor() {

		this.head = null;
		this.tail = null;

	}

	first() {

		return this.head;

	}

	last() {

		return this.tail;

	}

	clear() {

		this.head = this.tail = null;

		return this;

	}

	insertAfter( target, vertex ) {

		vertex.prev = target;
		vertex.next = target.next;

		if ( ! vertex.next ) {

			this.tail = vertex;

		} else {

			vertex.next.prev = vertex;

		}

		target.next = vertex;

		return this;

	}

	append( vertex ) {

		if ( this.head === null ) {

			this.head = vertex;

		} else {

			this.tail.next = vertex;

		}

		vertex.prev = this.tail;
		vertex.next = null; // the tail has no subsequent vertex

		this.tail = vertex;

		return this;

	}

	appendChain( vertex ) {

		if ( this.head === null ) {

			this.head = vertex;

		} else {

			this.tail.next = vertex;

		}

		vertex.prev = this.tail;

		while ( vertex.next !== null ) {

			vertex = vertex.next;

		}

		this.tail = vertex;

		return this;

	}

	remove( vertex ) {

		if ( vertex.prev === null ) {

			this.head = vertex.next;

		} else {

			vertex.prev.next = vertex.next;

		}

		if ( vertex.next === null ) {

			this.tail = vertex.prev;

		} else {

			vertex.next.prev = vertex.prev;

		}

		vertex.prev = null;
		vertex.next = null;

		return this;

	}

	removeChain( a, b ) {

		if ( a.prev === null ) {

			this.head = b.next;

		} else {

			a.prev.next = b.next;

		}

		if ( b.next === null ) {

			this.tail = a.prev;

		} else {

			b.next.prev = a.prev;

		}

		a.prev = null;
		b.next = null;

		return this;

	}

	empty() {

		return this.head === null;

	}

}

export { ConvexHull, Vertex, VertexList, Face };
