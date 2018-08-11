/**
 * @author Mugen87 / https://github.com/Mugen87
 * @author robp94 / https://github.com/robp94
 */

const expect = require( 'chai' ).expect;
const YUKA = require( '../../../build/yuka.js' );

const Matrix3 = YUKA.Matrix3;
const Vector3 = YUKA.Vector3;
const Quaternion = YUKA.Quaternion;

describe( 'Matrix3', function () {

	describe( '#identity()', function () {

		it( 'should transform the matrix to an identity matrix', function () {

			const matrix = new Matrix3();
			matrix.identity();

			expect( matrix.elements ).to.deep.equal( [ 1, 0, 0, 0, 1, 0, 0, 0, 1 ] );

		} );

	} );

	describe( '#set()', function () {

		it( 'should set values of matrix', function () {

			const m1 = new Matrix3();
			m1.set( 0, 0, 0, 0, 0, 0, 0, 0, 0 );

			expect( m1.elements ).to.deep.equal( [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ] );

		} );

	} );

	describe( '#copy()', function () {

		it( 'should copy a given matrix to the current instance', function () {

			const m1 = new Matrix3().set( 0, 1, 2, 3, 4, 5, 6, 7, 8 );
			const m2 = new Matrix3().copy( m1 );

			expect( m1 ).to.deep.equal( m2 );

		} );

	} );

	describe( '#clone()', function () {

		it( 'should return clone of matrix', function () {

			const m1 = new Matrix3().set( 0, 1, 2, 3, 4, 5, 6, 7, 8 );
			const m2 = m1.clone();

			expect( m1 ).to.deep.equal( m2 );

		} );

	} );

	describe( '#multiply()', function () {

		it( 'should perform a matrix multiplication', function () {

			const m1 = new Matrix3().set( 2, 3, 5, 7, 11, 13, 17, 19, 23 );
			const m2 = new Matrix3().set( 29, 31, 37, 41, 43, 47, 53, 59, 61 );

			m1.multiply( m2 );

			expect( m1.elements ).to.deep.equal( [ 446, 1343, 2491, 486, 1457, 2701, 520, 1569, 2925 ] );

		} );

	} );

	describe( '#premultiply()', function () {

		it( 'should perform a matrix multiplication but in different order', function () {

			const m1 = new Matrix3().set( 2, 3, 5, 7, 11, 13, 17, 19, 23 );
			const m2 = new Matrix3().set( 29, 31, 37, 41, 43, 47, 53, 59, 61 );

			m1.premultiply( m2 );

			expect( m1.elements ).to.deep.equal( [ 904, 1182, 1556, 1131, 1489, 1967, 1399, 1845, 2435 ] );

		} );

	} );

	describe( '#multiplyMatrices()', function () {

		it( 'should perform a matrix multiplication with two given matrices', function () {

			const m1 = new Matrix3().set( 2, 3, 5, 7, 11, 13, 17, 19, 23 );
			const m2 = new Matrix3().set( 29, 31, 37, 41, 43, 47, 53, 59, 61 );
			const m3 = new Matrix3().multiplyMatrices( m1, m2 );

			expect( m3.elements ).to.deep.equal( [ 446, 1343, 2491, 486, 1457, 2701, 520, 1569, 2925 ] );

		} );

	} );

	describe( '#multiplyScalar()', function () {

		it( 'should mulitply the matrix with a scalar value', function () {

			const m1 = new Matrix3().multiplyScalar( 2 );

			expect( m1.elements ).to.deep.equal( [ 2, 0, 0, 0, 2, 0, 0, 0, 2 ] );

		} );

	} );

	describe( '#extractBasis()', function () {

		it( 'should extract the basis vectors into the given target vectors', function () {

			const v0 = new Vector3();
			const v1 = new Vector3();
			const v2 = new Vector3();
			const m1 = new Matrix3();

			m1.extractBasis( v0, v1, v2 );

			expect( v0 ).to.deep.equal( { x: 1, y: 0, z: 0 } );
			expect( v1 ).to.deep.equal( { x: 0, y: 1, z: 0 } );
			expect( v2 ).to.deep.equal( { x: 0, y: 0, z: 1 } );

		} );

	} );

	describe( '#makeBasis()', function () {

		it( 'should build matrix of the given vectors', function () {

			const v0 = new Vector3( - 1, 0, 0 );
			const v1 = new Vector3( 0, 1, 0 );
			const v2 = new Vector3( 0, 0, - 1 );
			const m1 = new Matrix3().makeBasis( v0, v1, v2 );

			expect( m1.elements ).to.deep.equal( [ - 1, 0, 0, 0, 1, 0, 0, 0, - 1 ] );

		} );

	} );

	describe( '#lookAt()', function () {

		it( 'should create an orthonormal basis that rotates an entity towards the given target direction', function () {

			const m1 = new Matrix3();
			const v0 = new Vector3( 0, 0, 1 );
			const v1 = new Vector3( 0, 0, - 1 );
			const v2 = new Vector3( 0, 1, 0 );

			m1.lookAt( v0, v1, v2 );

			expect( m1.elements ).to.deep.equal( [ - 1, 0, 0, 0, 1, 0, 0, 0, - 1 ] );

		} );

		it( 'should produce a valid result when target rotation is collinear to worldUp', function () {

			const m1 = new Matrix3();
			const v0 = new Vector3( 0, 0, 1 );
			const v1 = new Vector3( 0, 1, 0 );
			const v2 = new Vector3( 0, 1, 0 );

			m1.lookAt( v0, v1, v2 );

			const e = m1.elements;

			expect( e[ 0 ] ).to.closeTo( 0.7071067811865475, Number.EPSILON );
			expect( e[ 1 ] ).to.closeTo( 0, Number.EPSILON );
			expect( e[ 2 ] ).to.closeTo( - 0.7071067811865475, Number.EPSILON );
			expect( e[ 3 ] ).to.closeTo( - 0.7071067811865476, Number.EPSILON );
			expect( e[ 4 ] ).to.closeTo( 0, Number.EPSILON );
			expect( e[ 5 ] ).to.closeTo( - 0.7071067811865476, Number.EPSILON );
			expect( e[ 6 ] ).to.closeTo( 0, Number.EPSILON );
			expect( e[ 7 ] ).to.closeTo( 1, Number.EPSILON );
			expect( e[ 8 ] ).to.closeTo( 0, Number.EPSILON );

		} );

	} );

	describe( '#transpose()', function () {

		it( 'should transpose the matrix', function () {

			const m1 = new Matrix3().set( 1, 2, 3, 4, 5, 6, 7, 8, 9 );
			m1.transpose();

			//sequence of set and elements is different
			expect( m1.elements ).to.deep.equal( [ 1, 2, 3, 4, 5, 6, 7, 8, 9 ] );

		} );

	} );

	describe( '#fromQuaternion()', function () {

		it( 'should create a matrix from a given quaternion', function () {

			const q1 = new Quaternion( 0, 1, 0, 0 );
			const m1 = new Matrix3().fromQuaternion( q1 );

			expect( m1.elements ).to.deep.equal( [ - 1, 0, 0, 0, 1, 0, 0, 0, - 1 ] );

		} );

	} );

	describe( '#fromArray()', function () {

		it( 'should fill the matrix with values from an array', function () {

			const m1 = new Matrix3().fromArray( [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ] );

			expect( m1.elements ).to.deep.equal( [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ] );

		} );

	} );

	describe( '#toArray()', function () {

		it( 'should store all values of the matrix in the given array', function () {

			const m1 = new Matrix3();
			const array = [];

			m1.toArray( array );

			expect( array ).to.deep.equal( [ 1, 0, 0, 0, 1, 0, 0, 0, 1 ] );

		} );

	} );

	describe( '#equals()', function () {

		it( 'should return true if the given matrix is equal to the current instance', function () {

			const m1 = new Matrix3();
			const m2 = new Matrix3();
			const m3 = new Matrix3().set( 1, 2, 3, 4, 5, 6, 7, 8, 9 );

			expect( m1.equals( m2 ) ).to.be.true;
			expect( m1.equals( m3 ) ).to.be.false;

		} );

	} );

} );
