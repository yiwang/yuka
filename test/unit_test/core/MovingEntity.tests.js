/**
 * @author Mugen87 / https://github.com/Mugen87
 *
 */

const expect = require( 'chai' ).expect;
const YUKA = require( '../../../build/yuka.js' );

const MovingEntity = YUKA.MovingEntity;
const Vector3 = YUKA.Vector3;

describe( 'MovingEntity', function () {

	describe( '#constructor()', function () {

		it( 'should create an object with correct default values', function () {

			const movingEntity = new MovingEntity();
			expect( movingEntity ).to.have.a.property( 'velocity' ).that.is.an.instanceof( Vector3 );
			expect( movingEntity ).to.have.a.property( 'maxSpeed' ).that.is.equal( 1 );
			expect( movingEntity ).to.have.a.property( 'updateOrientation' ).that.is.true;

		} );

	} );

	describe( '#update()', function () {

		it( 'should calculate the new position based on the current velocity', function () {

			const movingEntity = new MovingEntity();
			movingEntity.velocity.set( 0, 0, 1 );

			movingEntity.update( 1 );

			expect( movingEntity.position ).to.deep.equal( { x: 0, y: 0, z: 1 } );

		} );

		it( 'should clamp the velocity based on maxSpeed', function () {

			const movingEntity = new MovingEntity();
			movingEntity.velocity.set( 0, 0, 10 );
			movingEntity.maxSpeed = 5;

			movingEntity.update( 1 );

			expect( movingEntity.position ).to.deep.equal( { x: 0, y: 0, z: 5 } );

		} );

		it( 'should not change the rotation of the entity when updateOrientation is set to false', function () {

			const movingEntity = new MovingEntity();
			movingEntity.velocity.set( 0, 0, - 1 );
			movingEntity.updateOrientation = false;

			movingEntity.update( 1 );

			expect( movingEntity.rotation ).to.deep.equal( { x: 0, y: 0, z: 0, w: 1 } );

		} );

		it( 'should not change the rotation of the entity when velocity is close to zero', function () {

			const movingEntity = new MovingEntity();
			movingEntity.velocity.set( 0, 0, - Number.EPSILON );

			movingEntity.update( 1 );

			expect( movingEntity.rotation ).to.deep.equal( { x: 0, y: 0, z: 0, w: 1 } );

		} );

	} );

	describe( '#getSpeed()', function () {

		it( 'should return the speed value of the internal velocity vector', function () {

			const movingEntity = new MovingEntity();
			movingEntity.velocity.set( 2, 2, 1 );
			expect( movingEntity.getSpeed() ).to.equal( 3 );

		} );

	} );

	describe( '#getSpeed()', function () {

		it( 'should return the speed value in squared space of the internal velocity vector', function () {

			const movingEntity = new MovingEntity();
			movingEntity.velocity.set( 2, 2, 1 );
			expect( movingEntity.getSpeedSquared() ).to.equal( 9 );

		} );

	} );

} );
