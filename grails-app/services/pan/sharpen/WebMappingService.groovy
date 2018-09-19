package pan.sharpen

import com.vividsolutions.jts.geom.Coordinate
import com.vividsolutions.jts.geom.GeometryFactory
import com.vividsolutions.jts.geom.PrecisionModel
import org.springframework.util.FastByteArrayOutputStream

import javax.imageio.ImageIO
import java.awt.geom.AffineTransform
import java.awt.image.BufferedImage

class WebMappingService
{
	def mapViewService
	
	def getMap( def params )
	{
		def width = params.find { it.key.toUpperCase() == 'WIDTH' }?.value?.toInteger()
		def height = params.find { it.key.toUpperCase() == 'HEIGHT' }?.value?.toInteger()
		def outputImage = new BufferedImage( width, height, BufferedImage.TYPE_INT_ARGB )
		def bbox = params.find { it.key.toUpperCase() == 'BBOX' }?.value
		def srs = params.find { it.key.toUpperCase() == 'SRS' }?.value
		def layers = params.find { it.key.toUpperCase() == 'LAYERS' }?.value
		
		def inputFile = layers
		def imageMetadata = new ImageMetadata( inputFile )
		def entryId = 0
		def bands = imageMetadata.rgbBands ? '3,2,1' : 1
		
		def extent = imageMetadata.extent
		def coords = bbox?.split( ',' )*.toDouble()
		
		def geom1 = createGeom( coords, srs )
		def geom2 = createGeom( extent, 'epsg:4326' )
		
		if ( geom1.intersects( geom2 ) )
		{
			def outputFile = File.createTempFile( 'oms', '.png', '/tmp' as File )
			
			def cmd = [ 'ossim-chipper', '--op', 'ortho',
				'--cut-width', width,
				'--cut-height', height,
				'--cut-wms-bbox', bbox,
				'--srs', srs,
				'--bands', bands,
				'--histogram-op', 'auto-minmax',
				'--output-radiometry', 'U8',
				'--writer-prop', 'create_external_geometry=false',
				inputFile,
				'--entry', entryId,
				outputFile
			]

//		println cmd.join( ' ' )
			
			def start = System.currentTimeMillis()
			def p = cmd.execute()
			
			p.consumeProcessOutput()
			
			def exitCode = p.waitFor()
			def stop = System.currentTimeMillis()

//		println exitCode
//		println "${ stop - start }"
			
			def image = ImageIO.read( outputFile )
			def g2d = outputImage.createGraphics()
			
			g2d.drawRenderedImage( image, new AffineTransform() )
			g2d.dispose()
			outputFile.delete()
		}
		
		def ostream = new FastByteArrayOutputStream( width * height * 4 )
		
		ImageIO.write( outputImage, 'png', ostream )
		
		
		[ contentType: 'image/png', file: ostream.inputStream ]
	}
	
	private def createGeom( coords, srs )
	{
		def points = [
			[ coords[0], coords[1] ],
			[ coords[0], coords[3] ],
			[ coords[2], coords[3] ],
			[ coords[2], coords[1] ],
			[ coords[0], coords[1] ]
		] as Coordinate[]
		
		def code = srs?.split( ':' )?.last()?.toInteger()
		def geometryFactory = new GeometryFactory( new PrecisionModel( PrecisionModel.FLOATING ), code )
		def geom1 = geometryFactory.createPolygon( points )
		
		geom1
	}
}
