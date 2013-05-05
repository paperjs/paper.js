/* Curve/Curve Intersection by using Bezier Clipping by T.N '97 7/130 */
import java.applet.Applet;
import java.awt.*;
import java.io.*;
/*
**for line/curve
 main -- croot +-- curtrm +--- root
               I          +--- tspli1
               +-- croot_sub +-- curtrm 
                             +-- tdiv
** for curves/curve:
 fatline2 ---s_ovrlp+--- ovrlp +-- hull ---root3
                    I          +-- lr_split--lsplit
                    I                        rsplit
                    +--  subdiv
*/
/* ----------------------------------*/
public class fatlin extends Applet {
	Point[] p = new Point[10];
	Point[] p1 = new Point[10];
	Point2[] Pnt1 = new Point2[10];
	Point2[] Pnt2 = new Point2[10];

	int n = 0;
	int Nc=4;
	int ndiv = 60;
	int disp_con = 0;
	int curve1=0;
	double TOLEL= 0.01;
	int multi = 0;
    double tintt;
    int nsplit,iproces,n_clip;
     int mdeg1 =4,ndeg1=4;
	 double[][] xint2= new double[10][4];
	 Vec2 TU;

/* ----------------------------------*/		
	public void init() {
	String str;
	//	setBackground(Color.blue);
		setBackground(new Color( 40, 40,240)); //Color( 40, 40,140)
		setForeground(Color.red);

		setLayout(new BorderLayout(0,0));
		CheckboxGroup gc = new CheckboxGroup();
        Checkbox c1= new Checkbox("on",gc, true);
        Checkbox c2= new Checkbox("off",gc, false);
		Panel p = new Panel();
		p.add(c1);p.add(c2);p.add(new Label("Clipped Polygon"));
        add("South",p);

		//add("South",new Checkbox("Control Polygon"));
/*
    	Choice cn = new Choice(); //cに項目の追加
		cn.addItem("  degree 3 and 3 Bezier curves");
		cn.addItem("  degree 3 Bezier curve and line");
		cn.addItem("  degree 4 an 3 Bezier curve");
		cn.addItem("  degree 5 and 3 Bezier curves");
		cn.addItem("  degree 6 and 3 Bezier curves");
		cn.addItem("  degree 7 and 3 Bezier curves");
        add("North",cn);
*/
		    	Choice cn1 = new Choice(); //cに項目の追加
		cn1.addItem("  degree 3 and 3 Bezier curves");
		cn1.addItem("  degree 3 Bezier curve and line");
		cn1.addItem("  degree 4 an 3 Bezier curves");
		cn1.addItem("  degree 5 and 3 Bezier curves");
		cn1.addItem("  degree 6 and 3 Bezier curves");
		cn1.addItem("  degree 7 and 3 Bezier curves");
        add("North",cn1);
	if ((str = getParameter("dim")) != null) {
	    Nc= Integer.parseInt(str) ; }
 		resize(350,340);
    }
/* ----------------------------------*/
    public void paint(Graphics g) {
	 int i,ix,nint=0;
	 int ay=180,wy=120,wx=300;
     double[] x1 = new double[10];
     double[] wt1 = new double[10];
     double[] wt2 = new double[10];
	 double[] xint = new double[8];
	 double a,b,c,tmp;

 		 g.setColor(Color.yellow);
		 for(i = 0; i < n; i++) g.fillOval(p[i].x-3, p[i].y-3, 7, 7);
 		 g.setColor(Color.black);
		 for(i = 1; i < n; i++) g.drawLine(p[i-1].x, p[i-1].y, p[i].x, p[i].y); 

	   if(curve1==0) {
	    	if(n==ndeg1) {	g.setColor(Color.red);
		    for(i=0;i<ndeg1;i++) p1[i]=p[i];
			DrawCurve(ndeg1-1,p1,g);
			n=0; curve1=1;
            }
       }
       else {
		for(i = 0; i < ndeg1; i++) g.fillOval(p1[i].x-3, p1[i].y-3, 7, 7);

 		 g.setColor(Color.black);
		 // plot control polygon of degree Nc curve 
	//	 if(disp_con==0)
		  for(i = 1; i < ndeg1; i++) g.drawLine(p1[i-1].x, p1[i-1].y, p1[i].x, p1[i].y); 
		 // plot line
		 if(n==mdeg1) { g.setColor(Color.yellow);
    		 for(i = 1; i < mdeg1; i++) g.drawLine(p[i-1].x, p[i-1].y, p[i].x, p[i].y); 
             	if(mdeg1>2)	DrawCurve(mdeg1-1,p,g);
              curve1 = 2;		 //g.drawString(" curve1="+curve1,120,ay+12);
		 }
		 // plot degree Nc curve 
			g.setColor(Color.red); DrawCurve(ndeg1-1,p1,g);
	   }

		if(curve1==2) {	g.setColor(Color.red); curve1=0;

            for(i = 0; i < ndeg1; i++) Pnt1[i]=int2dbl(p1[i]);
            for(i = 0; i < mdeg1; i++) Pnt2[i]=int2dbl(p[i]);
            if(mdeg1==2) {
              a = Pnt2[0].y-Pnt2[1].y; b = Pnt2[1].x-Pnt2[0].x;   /*  coefficient of fat_line  */
              tmp = Math.sqrt(a*a+b*b); a = a/tmp; b = b/tmp ;
              c = -(a*Pnt2[0].x + b*Pnt2[0].y);
  		       for(i=0; i <ndeg1; i++) {
			   x1[i] = Pnt1[i].x*a+ Pnt1[i].y*b +c;}
			   nint = croot( x1, xint, ndeg1-1,g);
			}
			else { 
		 	 for(i=0; i <ndeg1; i++) wt1[i]=1.;
			 for(i=0; i <mdeg1; i++) wt2[i]=1.;
			 nint = fatlin2(ndeg1-1,Pnt1,wt1,mdeg1-1,Pnt2,wt2,g);
            }
            curve1=0;  n=0;
			g.setColor(Color.white);
			g.drawString("No. of Intersections = "+nint,20,35);
			if(nint>0) {
				for(i=0;i<nint; i++){
                if(mdeg1==2) {
		    		g.drawString(" t = "+xint[i],25+75*i,50);
			       p[2] = castljau(xint[i],ndeg1-1,p1);
				}
				else {
				 g.drawString(" s = "+xint2[i][0],25+75*i,50);
				 g.drawString(" t = "+xint2[i][1],25+75*i,62);
			     p[2] = castljau(xint2[i][0],ndeg1-1,p1);
				}
				 g.fillOval(p[2].x-3, p[2].y-3, 7, 7);
				}
			}
		}
    }
/* ----------------------------------*/
	public Point2 int2dbl(Point p)   {
    return new Point2((double)p.x, (double)p.y);
	}
/* ----------------------------------*/
	public void DrawCurve(int ndeg,Point pnt[], Graphics g)   {
		Point old = pnt[0];
		for(int i=1; i <= ndiv; i++){
				double u = (double)i /(double)ndiv;
			    Point current = castljau(u,ndeg,pnt);
				g.drawLine(old.x,old.y,current.x,current.y);
				old = current;	}
    }
/* ----------------------------------*/
	public Point castljau(double u, int ndeg, Point pnt[])	{
       double[] wx = new double[10];
       double[] wy = new double[10];

       for (int i=0; i <=ndeg; i++){
        wx[i] = (double)pnt[i].x;  wy[i] = (double)pnt[i].y;}
       for (int m=1; m <= ndeg; m++) {
        for (int j=0; j <= ndeg - m; j++) {
          wx[j] +=(wx[j+1]-wx[j])*u ;
          wy[j] +=(wy[j+1]-wy[j])*u;  }
       }
       return new Point((int)wx[0],(int)wy[0]);    
    }
/* ----------------------------------*/				
    public boolean mouseDown(Event evt, int x, int y) {
		if(n < Nc){ 
			   p[n] = new Point(x,y);	n++;
		}else{	n=0; }
		repaint();
		return true;
    }
/* ----------------------------------*/
	public boolean action(Event evt, Object obj) {
		if(evt.target instanceof Checkbox) {
             Checkbox c = (Checkbox)(evt.target);
			 if(c.getLabel().equals("on")){ disp_con=0; n=0;
	 	     } else {disp_con= 1; n=0;} 
		}
		if (evt.target instanceof Choice) {
            Choice c = (Choice)(evt.target);
			n = 0;
			switch(c.getSelectedIndex()) {
				case 1 :	Nc = 4;	ndeg1 =4; mdeg1=2; break;
				case 0 :	Nc = 4;	ndeg1 =4; mdeg1=4; break;
				case 2 :	Nc = 5;	ndeg1 =5; mdeg1=4;break;
				case 3 :	Nc = 6;	ndeg1 =6; mdeg1=4;break;
				case 4 :	Nc = 7;	ndeg1 =7; mdeg1=4;break;
				case 5 :	Nc = 8;	ndeg1 =8; mdeg1=4;break;
				case 6 :	Nc = 9;ndeg1 =9; mdeg1=4; break;
			}
		 }
			return true;
	}
	/* ----------------------------------*/
	public void DispDiv(int ndeg,Graphics g){
		int i;
       double[] x= new double[10];
       double[] y= new double[10];
	   double t=0.5;
	   int[] prx = new int[10];	   int[] pry = new int[10];
	   int[] plx = new int[10];	   int[] ply = new int[10];
     double[] xleft = new double[10];
     double[] xright = new double[10];

      for( i=0;i<=ndeg; i++) x[i]=(double)p[i].x;	  
	  tdiv(x,xleft,xright,t,ndeg);
      for( i=0;i<=ndeg; i++) plx[i]=(int)xleft[i];
     for( i=0;i<=ndeg; i++) prx[i]=(int)xright[i];

      for( i=0;i<=ndeg; i++) y[i]=(double)p[i].y;
	  tdiv(y,xleft,xright,t,ndeg);
      for( i=0;i<=ndeg; i++) ply[i]=(int)xleft[i];
      for( i=0;i<=ndeg; i++) pry[i]=(int)xright[i];
	  
	  g.setColor(Color.white);
      for(i = 1; i <= ndeg; i++) 
      g.drawLine(plx[i-1], ply[i-1], plx[i], ply[i]);

      g.setColor(Color.gray);
     for(i = 1; i <= ndeg; i++) 
     g.drawLine(prx[i-1], pry[i-1], prx[i], pry[i]);
	}
		/* ----------------------------------*/
/*
	public void DispSplit(int ndeg,Graphics g){
		int i;
       double[] x= new double[10]; double[] y= new double[10];
	   double tl=0.33,ur=0.66;
	   int[] plx = new int[10];	   int[] ply = new int[10];

      for( i=0;i<=ndeg; i++) x[i]=(double)p[i].x;
	  tspli1(x,tl,1.-ur, ndeg) ;	  //tdiv1(x,xleft,xright,t,ndeg);
      for( i=0;i<=ndeg; i++) plx[i]=(int)x[i];

      for( i=0;i<=ndeg; i++) y[i]=(double)p[i].y;
	  tspli1(y,tl,1.-ur, ndeg);	//  tdiv1(x,xleft,xright,t,ndeg);
      for( i=0;i<=ndeg; i++) ply[i]=(int)y[i];

	  g.setColor(Color.white);
      for(i = 1; i <= ndeg; i++) 
      g.drawLine(plx[i-1], ply[i-1], plx[i], ply[i]);
	}
*/
	/* ----------------------------------------------------*/
	/*
	public void DispPart(int ndeg,double tl, double tr,double y[], Graphics g){
	int i;
    double[] x= new double[10]; 
	int[] plx = new int[10];	   int[] ply = new int[10];
	Point[] pnt = new Point[10];

      for( i=0;i<=ndeg; i++) {
		  double t=(tr-tl)*(double)(i)/(double)ndeg+tl;
		  plx[i]=10+(int)(300.*t);}
      for( i=0;i<=ndeg; i++) ply[i]=(int)y[i]+180;

      for(i = 1; i <= ndeg; i++) 
      g.drawLine(plx[i-1], ply[i-1], plx[i], ply[i]);
	  			//DrawCurve(Nc-1,pnt,g);
	}
*/
/* ********************************************************************: */
	public void tdiv(double x[], double xleft[], double xright[],
    double t,int ndeg) {
      int i,k;
      double[][] bz= new double[10][10];

      for(i=0; i <= ndeg; i++) bz[0][i] = x[i];
      for(k=0; k < ndeg; k++)
         for(i=1; i <= ndeg; i++) 
             bz[k+1][i] = bz[k][i-1] + t*(bz[k][i] - bz[k][i-1]) ;

      for(i=0; i <= ndeg; i++) { xleft[i] = bz[i][i];
                                xright[i] = bz[ndeg-i][ndeg];}; 
}
/* ********************************************************************: */
     public void tspli1(double x[],double tl,double ur,int ndeg)  {
      int i, j;
      double tmp;

      for(i=1; i <= ndeg; i++) {
//          for(j=0; j <= ndeg-i; j++) x[j] = x[j] + tl*(x[j+1] - x[j]); } ;
          for(j=0; j <= ndeg-i; j++) x[j] += tl*(x[j+1] - x[j]); } ;
		  if(ur > 0.999999) return ;

      tmp = ur/(1.0-tl);
      for(i=1; i <= ndeg; i++) {
//          for(j=ndeg; j >= i; j--) x[j] = x[j] + (x[j-1] - x[j])*tmp;} ;
          for(j=ndeg; j >= i; j--) x[j] += (x[j-1] - x[j])*tmp;} ;
}
/* ********************************************************************: */
 public int croot(double x1[],double xint[],int ndeg,Graphics g) {
      double span;
      int iover,nint;
      double[] t1= new double[2];

      nint = 0;
      t1[0] = 0.; t1[1] = 1.;  span = 1./(double)ndeg;
      iover = curtrm(x1,t1,ndeg,span,g) ;
      if(iover == 1) { xint[nint] = tintt ;  return (1); }
      else if(iover == -1) {
 	   if(t1[1]-t1[0]<0.98) tspli1(x1,t1[0],1.- t1[1], ndeg); 
		//g.drawString(" tl[0] = "+t1[0],30,80); g.drawString(" tl[1] = "+t1[1],30,90);
     //   g.setColor(Color.gray);	DispPart( ndeg, t1[0], t1[1],x1, g);
 	    nint = croot_sub(x1,t1,nint,xint,ndeg,span,g);} 
      return (nint);
}
/* ********************************************************************: */
      public int curtrm(double x1[],double t1[],int ndeg,
	  double span,Graphics g) {
      double   zero = 0.000001;
	  double  t0;
      int i,  ic;
      double[] cf = new double[10];

      for(i=0; i<= ndeg ; i++)  cf[i] = x1[i] ;
      for(ic=0; ic<10; ic++) {
 
      if((cf[0] > zero) && (cf[ndeg] > zero)) 
         {for(i=1; i< ndeg ; i++) { if(cf[i] < -zero) return (-1) ; }
         return (0);}
      else if((cf[0] < -zero) && (cf[ndeg] < -zero))
         {for(i=1; i< ndeg; i++) { if(cf[i] > zero) return (-1); } 
          return (0);}
        Vec2 TT = root(ndeg, span, cf) ;   //tl = TT.u; tr = TT.v; 
        t0 = t1[0];
        t1[0] = t0 + (t1[1]-t0)*TT.u; t1[1] = t0 + (t1[1]-t0)*TT.v;
      if(t1[1]-t1[0] < TOLEL) { 
		  tintt = (t1[0]+t1[1])*0.5; return (1);}
      else { if((TT.u< 0.02) && (TT.v>0.98))  return (-1) ;
             tspli1(cf, TT.u, 1.- TT.v, ndeg);  } 
      }
      return (0); 
}
/* ********************************************************************: */
 public int croot_sub(double x1[],double t1[],int nint,
	  double xint[],int ndeg,double span,Graphics g) {
      double  x1l[],x1r[],t1l[],t1r[];
      int i,iover, jover;

	  x1l = new double[20];	   x1r = new double[20];
      t1l = new double[2];    t1r = new double[2];

       jover = 0;
       tdiv(x1, x1l, x1r,0.5,ndeg);
        //tdiv1(x1,0.5,ndeg);for( i=0;i<=ndeg; i++) x1l[i]=xleft[i];
		//g.drawString(" tdiv; tl[1] = "+t1[1],30,100);
/* for left half*/
       t1l[1] = t1[0] + (t1[1]-t1[0])*0.5; t1l[0] = t1[0]; 
	   t1r[0] = t1l[1];
       iover = curtrm(x1l,t1l,ndeg,span,g) ;
       if(iover == 1) { xint[nint] = tintt; nint = nint + 1;
                        if(multi == 1) return 0; }
       else if(iover == -1) {
            nint=croot_sub(x1l,t1l,nint,xint,ndeg,span,g);
           if((multi == 1) && (nint>0)) return 0; 
           jover=1;}

/* for right half*/
        t1r[1] = t1[1];
        iover = curtrm(x1r,t1r,ndeg,span,g) ;
        if(iover == 1) { xint[nint] = tintt; nint = nint + 1; 
                        if(multi == 1) return 0; }
        else if(iover == -1) 
		  {nint=croot_sub(x1r,t1r,nint,xint,ndeg,span,g);
                        jover=1;}
        //return jover;
		return nint;
 }
/* ********************************************************************: */
//int root3(nmdeg,span,cf, tl, ur)
public int root3(int nmdeg, double span, double cf[], double tlr[]) {
      double t, tmin, tmax;
      int i,j;
      if((cf[0] > 0.) && (cf[nmdeg] < 0.) ) /* (+ ? ? -) > right cut [0,tmax] */
      {     tmax = 0. ;  /* do 310 */
            for (i=0; i < nmdeg; i++) {
              if(cf[i] > 0.) {
                for(j= i+1 ; j <= nmdeg; j++) {
                  if(cf[j] < cf[i]) {
                    if(cf[j] < 0.) {
                    t = (cf[i]/(cf[i]-cf[j])*(double)(j-i)+i)*span;
                    if(t > tmax) tmax = t;
                    }
                  }
                }
              }
             }
            if(tmax != 0.) {
              if(tlr[0] > tmax+.000001) return (-1)  ;
              if(tlr[1] > tmax) tlr[1] = tmax;}
       } 
       else if( (cf[0] < 0.) && (cf[nmdeg] > 0.) ) 
/*                            (- ? ? +) > left cut  [tmin,1.] */
       {    tmin = 1. ;  /* do 320 */
            for(i=0; i < nmdeg; i++) {
             if(cf[i] < 0.) {
              for(j=i+1; j <= nmdeg ; j++) {
                 if(cf[j] > cf[i]) {
                     if(cf[j] > 0.) {
                     t = (cf[i]/(cf[i]-cf[j])*(double)(j-i)+i)*span ;
                     if(t < tmin) tmin = t ;
                     }
                 }
               }
             }
            }
            if(tmin != 1.) {
                  if(tlr[1] < tmin-0.000001) return (-1) ;
                  if(tlr[0] < tmin) tlr[0] = tmin;   }
        }
        else if( (cf[0]> 0) && (cf[nmdeg] > 0.) ) { }
       /*               split 1/2          */
        else if( (cf[0] < 0.) && (cf[nmdeg] < 0.)) 
/*                         (- ? ? -) > both side cut    [tmin,tmax] */
        {   tmax = 0. ;       /* do 330 */
            for(i=1; i < nmdeg; i++) {
                for(j=i+1; j <= nmdeg; j++) {
                    if( (cf[i] > 0.) && (cf[j] < 0.)) {
                    t = (cf[i]/(cf[i]-cf[j])*(double)(j-i)+i)*span ;
                    if(t > tmax) tmax = t ;
                    }
                }
             }
            if(tmax != 0) {
                   if(tlr[0] > tmax+.000001) return (-1)  ;
                   if(tlr[1] > tmax) tlr[1] = tmax ; }
           tmin = 1. ;       /* do 340 */
           for(i=0; i < nmdeg-1; i++)    {
              for(j=i+1; j < nmdeg; j++) {
                 if((cf[i] < 0) && (cf[j] > 0.)) {
                 t = (cf[i]/(cf[i]-cf[j])*(double)(j-i)+i)*span ;
                 if(t < tmin) tmin = t;     
               }
               }
            }
            if(tmin != 1.) {
               if(tlr[1] < tmin-0.000001) return (-1) ;
               if(tlr[0] < tmin) tlr[0] = tmin ;  }
       }
         return (0) ;
}
 /*::::: root ********************************************** */
      public Vec2 root(int nmdeg, double span, double cf[]) {
      double t, tmin, tmax;
      int i,j;

      tmin = (double)nmdeg ; tmax = 0. ;
      for (i=0; i< nmdeg; i++) {
          if(cf[i] > 0.) {
              for(j= i+1 ; j <= nmdeg; j++) {
                 if(cf[j] < 0.) {
                    t = (cf[i]/(cf[i]-cf[j])*(double)(j-i)+i);
                    if(t > tmax) tmax = t; if(t < tmin) tmin = t;}
              }; }
          else if(cf[i] < 0.) {
              for(j= i+1 ; j <= nmdeg; j++) {
                 if(cf[j] > 0.) {
                    t = (cf[i]/(cf[i]-cf[j])*(double)(j-i)+i);
                    if(t > tmax) tmax = t; if(t < tmin) tmin = t;}
              };
          }
      }
      double tl = tmin*span; double ur = tmax*span; //return (0) ;
	  return new Vec2(tl,ur);
    }

/* ********************************************************************: */
 int fatlin2(int ndeg, Point2 p1[],double wt1[],int mdeg,Point2 p[],
				  double wt2[], Graphics g) {
     double[] t1= new double[2];
	 double[] t2= new double[2];
     double[] x1= new double[20];
     double[] x2= new double[20];
     double[] y1= new double[20];
     double[] y2= new double[20];
     double[] w1= new double[20];
     double[] w2= new double[20];
    int  i, nint;

    for(i=0; i <= ndeg; i++) {
      x1[i] = p1[i].x*wt1[i]; y1[i] = p1[i].y*wt1[i]; w1[i] = wt1[i];}
    for(i=0; i <= mdeg; i++) {
      x2[i] = p[i].x*wt2[i]; y2[i] = p[i].y*wt2[i]; w2[i] = wt2[i];}

      nsplit = 0;   nint = 0;  n_clip = 0; 
      t1[0] = 0.0;  t1[1] = 1.0;   t2[0] = 0.0;  t2[1] = 1.0;

      nint = s_ovrlp(ndeg,x1,y1,w1,t1, mdeg,x2,y2,w2,t2,nint,g);
      return (nint);
 }
/* ********************************************************************: */
int s_ovrlp(int ndeg,double x1[],double y1[],double w1[],double t1[],
	int mdeg,double x2[],double y2[],double w2[],double t2[],
	int nint,Graphics g)
{
	 double[] x1l= new double[20];
     double[] y1l= new double[20];
     double[] w1l= new double[20];
     double[] t1l= new double[2];

     double[] x1r= new double[20];
     double[] y1r= new double[20];
     double[] w1r= new double[20];
	 double[] t1r= new double[2];

     double[] x2l= new double[20];
     double[] y2l= new double[20];
     double[] w2l= new double[20];
     double[] t2l= new double[2];

     double[] x2r= new double[20];
     double[] y2r= new double[20];
     double[] w2r= new double[20];
	 double[] t2r= new double[2];

	 double[] xt1= new double[20];
     double[] yt1= new double[20];
     double[] wt1= new double[20];
     double[] tt1= new double[2];

     double[] xt2= new double[20];
     double[] yt2= new double[20];
     double[] wt2= new double[20];
     double[] tt2= new double[2];

   //  double TOLEL  =   0.001;
   //  double dd=0.01;
    int  iover=0;

    iover = ovrlp(ndeg,x1,y1,w1,t1,mdeg,x2,y2,w2,t2,g);
//	System.err.println(" ovlp:Iover="+iover+",nint="+nint);
	if(iover!=0) {
//    System.err.println(" t1.0=" + t1[0]+",t1.1="+t1[1]+" Iover="+iover);
 //   System.err.println(" t2.0=" + t2[0]+",t2.1="+t2[1]+" Iover="+iover);
    }
	if(iover == 1) {
           if(nint > 20)   return (-1);
           xint2[nint][0] = t1[0]; xint2[nint][1] = t2[0];
    //       xint2[nint][2] = dd;    
		   nint= nint +1; 
	}
    else if(iover == -1) {
          subdiv(ndeg,x1,y1,w1, x1l,y1l,w1l, x1r,y1r,w1r,0.5,t1,t1l,t1r);
           subdiv(mdeg,x2,y2,w2, x2l,y2l,w2l, x2r,y2r,w2r,0.5,t2,t2l,t2r);
           cuvbuf(ndeg,x1l,y1l,w1l,t1l, xt1,yt1,wt1,tt1);
           cuvbuf(mdeg,x2l,y2l,w2l,t2l, xt2,yt2,wt2,tt2);
 //   System.err.println(" bef s_over;t1=" + t1[0]+",t1.2="+t1[1]+" iover="+iover);
           nint=s_ovrlp(ndeg,x1l,y1l,w1l,t1l, mdeg,x2l,y2l,w2l,t2l,nint,g);
  //  System.err.println(" aft s_over;nint=" + nint);

           cuvbuf(ndeg,xt1,yt1,wt1,tt1, x1l,y1l,w1l,t1l);
           cuvbuf(mdeg,xt2,yt2,wt2,tt2, x2l,y2l,w2l,t2l);
           cuvbuf(mdeg,x2r,y2r,w2r,t2r, xt2,yt2,wt2,tt2);
           nint = s_ovrlp(ndeg,x1l,y1l,w1l,t1l, mdeg,x2r,y2r,w2r,t2r,nint,g);
           cuvbuf(mdeg,xt2,yt2,wt2,tt2, x2r,y2r,w2r,t2r);
           cuvbuf(ndeg,x1r,y1r,w1r,t1r,xt1,yt1,wt1,tt1);

           nint=s_ovrlp(ndeg,x1r,y1r,w1r,t1r,mdeg,x2l,y2l,w2l,t2l,nint,g);
           cuvbuf(ndeg,xt1,yt1,wt1,tt1,x1r,y1r,w1r,t1r);

           nint=s_ovrlp(ndeg,x1r,y1r,w1r,t1r,mdeg,x2r,y2r,w2r,t2r,nint,g);
            nsplit = nsplit + 2;
		   showStatus(" Number of split="+ nsplit+" Number of clip="+n_clip);
	}
    else if(iover == -2) {
          subdiv(ndeg,x1,y1,w1, x1l,y1l,w1l, x1r,y1r,w1r,0.5,t1,t1l,t1r);
          cuvbuf(mdeg,x2,y2,w2,t2,xt2,yt2,wt2,tt2);

          nint=s_ovrlp(ndeg,x1l,y1l,w1l,t1l,mdeg,x2,y2,w2,t2,nint,g);
           cuvbuf(mdeg,xt2,yt2,wt2,tt2,x2,y2,w2,t2);

           nint=s_ovrlp(ndeg,x1r,y1r,w1r,t1r,mdeg,x2,y2,w2,t2,nint,g);
           nsplit ++;
		   showStatus(" Number of split="+ nsplit+" Number of clip="+n_clip);
	}
    else if(iover == -3) {
         subdiv(mdeg,x2,y2,w2, x2l,y2l,w2l, x2r,y2r,w2r,0.5,t2,t2l,t2r);
         cuvbuf(ndeg,x1,y1,w1,t1,xt1,yt1,wt1,tt1);

          nint=s_ovrlp(ndeg,x1,y1,w1,t1,mdeg,x2l,y2l,w2l,t2l,nint,g);
          cuvbuf(ndeg,xt1,yt1,wt1,tt1,x1,y1,w1,t1);

          nint = s_ovrlp(ndeg,x1,y1,w1,t1,mdeg,x2r,y2r,w2r,t2r,nint,g);
           nsplit ++; 
 		  showStatus(" Number of split="+ nsplit+" Number of clip="+n_clip);
	}
    return nint;
 }
/* ********************************************************************: */
void cuvbuf(int ndeg,double x1[],double y1[],double w1[],double t1[],
			double xt1[],double yt1[],double wt1[],double tt1[])
{
    int  i;
    for(i=0; i <= ndeg; i++) {
           xt1[i] = x1[i]; yt1[i] = y1[i]; wt1[i] = w1[i];}
    tt1[0] = t1[0]; tt1[1] = t1[1];
}
/* ********************************************************************: */
int hull(int ndeg,double x[],double y[],double w[],int mdeg,
		 double xx[],double yy[],double ww[],
		 //double tl,double ur,double aa,double bb,
		 int mono,Graphics g) {
     int  i, il, iposi,k, inega;
     double x0,y0,x3,y3,a,b,tmp,cmin,cmax,tmp1,span;
     double dmin, dmax=0.;
     double[] cf = new double[10];
     double[] bf = new double[10];
     double[] tlr = new double[2];
     double tl, ur;
     int nside = 2;

     x0 = xx[0]; y0 = yy[0];
     x3 = xx[mdeg]; y3 = yy[mdeg];

     a = y0-y3; b = x3-x0;   /*  coefficient of fat_line  */
     tmp = Math.sqrt(a*a+b*b);

     if(tmp < 0.000001) tmp = 1;
     a = a/tmp; b = b/tmp ;
  //   aa = -b; bb = a;
/*       calculation  [cmin,cmax], [dimin,dmax]   */
      cmin = -a*x0 - b*y0; cmax = cmin;

     /*for(i=1; i <= mdeg; i++) {*/
     for(i=1; i < mdeg; i++) {
          tmp1 = -(a*xx[i] + b*yy[i]);
          if(tmp1 < cmax) cmax = tmp1; if(tmp1 > cmin) cmin = tmp1;
     }
//     System.err.println(" hull:a,b=" + a+b+",cmin"+cmin+" cmax="+cmax);

     span = 1./(double)ndeg;
     tl = 0.; ur = 1.; TU= new Vec2(tl,ur);
     tlr[0]=0.; tlr[1]=1.;

     for(il=1; il <= nside; il++) {
            inega = 0; iposi = 0;
      if(il == 1) {
            for(k=0; k <= ndeg; k++) {
                bf[k] =  a*x[k] + b*y[k] ;
                cf[k] =  bf[k] + cmin;
              if(cf[k] > 0.0001) iposi = 1;
              else if(cf[k] < -0.0001) inega = 1;}
             }
      else if(il == 2) {
            /*for(k=0; k<= ndeg; k++) {*/
            for(k=0; k<= ndeg; k++) {
              cf[k] =  -(bf[k] + cmax);

              if(cf[k] > 0.0001) iposi = 1;
              else if(cf[k] < -0.0001) inega = 1;
          }
         }
      else if(il == 3) {
                       if(ur-tl < 0.5) {TU= new Vec2(0.,1.); return (-1);} 
/* >>>>>>>>>>>>    calculation   [dimin,dmax] >>>>>>>>>>>>>>>>>>>>>>> */
        dmin = -b*x0 + a*y0; dmax = dmin;

        for(i=1; i<= mdeg-1; i++) {
             tmp = (-b*xx[i] + a*yy[i]);
             if(tmp < dmax) dmax = tmp;
             if(tmp > dmin) dmin = tmp;   }
        tmp = -b*x3 + a*y3;
        if(tmp < dmax) dmax = tmp;
        if(tmp > dmin) dmin = tmp;
        for (k=1; k <= ndeg; k++) {
             cf[k] =  b*x[k] -a*y[k] + dmin;
             if(cf[k] > 0.0000) iposi = 1;
             else inega = 1;}
        }
      else {
           for (k=1; k <= ndeg; k++) {
             cf[k] =  -b*x[k] + a*y[k] - dmax;
             if(cf[k] > 0.) iposi = 1;
             else inega = 1;}
       }
// System.err.println(" il="+il+" cf="+cf[0]+", "+cf[1]+", "+cf[2]+", "+cf[3]);

       if(iposi == 0) {TU= new Vec2(0.,1.); return (-1);} /* all negative means : dont't overlap */
       if(inega != 0) {             /*      (+ + + +) */
       //     Vec2 TT = root1(ndeg, span, cf,tl,ur) ;   //tl = TT.u; tr = TT.v;
		   if(root3(ndeg, span, cf,tlr)<0) {TU= new Vec2(0.,1.); return (-1);} 
            TU= new Vec2(tlr[0],tlr[1]); // TU=TT;
            //tl = TU.u; ur = TU.v; 
          //  if(root(ndeg,span,cf,tl,ur) < 0)  return (-1);
//           System.err.println(" root;t1=" + TU.u+",ur="+TU.v+" iposi="+iposi);
/*
             if(cf[0]<-0.001)  
              if(cf[ndeg]>0.001) {  mono = 1;
                     for (k=0; k < ndeg; k++) {
                     if(cf[k] > cf[k+1]-0.00001) {mono = 0; break;}
                     }
               }
             else { 
              if(cf[ndeg]<-0.001) { mono = 1;
                     for (k=0; k < ndeg; k++) {
                     if(cf[k] < cf[k+1]+0.00001) {mono = 0; break;}
                     }
               }
             } */
         } 
	   else TU= new Vec2(0.,1.); 
     }   /* loop for il */
     return (0);
}
/* ********************************************************************: */
int ovrlp(int ndeg,double x1[],double y1[],double w1[],double t1[],
		  int mdeg,double x2[],double y2[],double w2[],double t2[],
		  Graphics g)
//		  double dd,Graphics g)
/* ********************************************************************: */
/*
  Checks the overlap of the two curve segments
  return = 0  for no overlap (=no intersections)
         = -1 for inadequate clip (split each curve and try again)
         = 1  for intersection found                                     */
{
      double tmp1, tmp2, ur22;
      double aa2=0.,bb2=1., ur11;
	  double tl2,ur2,tl1, ur1;
	  double aa=0.,bb=1.;
      /*static FloatType tol=0.001;*/
      int icount, mono1,mono2;   /*int nnn = 10;*/
      int jover=0;

      for(icount=0; icount< 20; icount ++) {
          iproces++; //dd = 0.;
          mono1 = 0;  mono2 = 0;
          /*if(iproces > nnn) nside = 2;*/

/*   The fat line is defined by two bounding lines:
                aX + bY + cmin
               -aX - bY - cmax
                bX - aY + dmin
               -bX + bY - dmax
 where for any point (X,Y) between the two lines, both function values are 
 positive. Portions of the curve in the negative hal f space are trimmed away. */

/*  curve-2 is clip by curve-1 */
		  jover = hull(mdeg,x2,y2,w2,ndeg,x1,y1,w1,mono1,g);
//         System.err.println(" hull-1;jover="+jover);
	    if(jover < 0) return 0;
        if(jover == 1) return (-3);
//         System.err.println(" hull-1;tl2=" + TU.u+",ur2="+TU.v+" jover="+jover);
//		 showStatus(" hull-1;tl2="+ TU.u+",ur2="+TU.v+" jover="+jover+" t2="+t2[0]+","+t2[1]);
        ur22 = 1. - TU.v;		  tl2=TU.u; ur2=TU.v;

        tmp2 = t2[0] + tl2*(t2[1]-t2[0]);  tmp1 = t2[1] + ur22*(t2[0]-t2[1]);

      if     ((tmp1-tmp2)< TOLEL) { /* cut curve-2 by curve-1 */ 
          if((t1[1]-t1[0]) <= TOLEL) {t2[1] = tmp1;  t2[0] = tmp2;return 1;}
        }
       if(tl2> 0.02 || ur2 < 0.98) {
           t2[1] = tmp1; t2[0] = tmp2;
           lr_split(mdeg,x2,y2,tl2,ur22); n_clip++ ;
//		  System.err.println(" x2:split; tl2=" + tl2+",ur2="+ur2);
		   //System.err.println(" x2=" + x2[0]+",y2="+y2[0]);
		 showStatus(" Number of split="+ nsplit+" Number of clip="+n_clip);
		 if(disp_con==0) {
		     g.setColor(Color.green);
             for(int k=0;k<mdeg;k++)
             g.drawLine((int)x2[k], (int)y2[k], (int)x2[k+1], (int)y2[k+1]); 
  //         g.drawLine((int)x2[0], (int)y2[0], (int)x2[mdeg], (int)y2[mdeg]); 
		 }
       }
/*  curve-1 is clip by curve-2 */
       jover = hull(ndeg,x1,y1,w1,mdeg,x2,y2,w2,mono2,g);
//	   System.err.println(" hull-2:jover="+jover);
       if(jover < 0) return 0;
       if(jover == 1) return (-2);
	   tl1=TU.u; ur1=TU.v;
//	   System.err.println(" hull-2:tl1=" + tl1+",ur1="+ur1+" jover="+jover);
//	   showStatus(" hull-2;tl1="+ tl1+",ur1="+ur1+" jover="+jover+" t1="+t1[0]+","+t1[1]);

       if((ur2 - tl2 > 0.80) && (ur1 - tl1 > 0.80)) return (-1) ;
       if( ur1 - tl1 > 0.98 ) return (-2) ;

        ur11 = 1-ur1;
        tmp1 = t1[0] + tl1*(t1[1]-t1[0]); tmp2 = t1[1] + ur11*(t1[0]-t1[1]);
       if( (ur2 - tl2 > 0.98) && icount>0 ) {
           t1[1] = tmp2;  t1[0] = tmp1;
           lr_split(ndeg,x1,y1,tl1,ur11); n_clip++ ;
//		   System.err.println(" x1:split; tl1=" + tl1+",ur1="+ur1);
		 showStatus(" Number of split="+ nsplit+" Number of clip="+n_clip);
		 if(disp_con==0) {
		   g.setColor(Color.gray);
           g.drawLine((int)x1[0], (int)y1[0], (int)x1[ndeg], (int)y1[ndeg]);
		 } 
           return (-3) ;      }

       if((tmp2-tmp1)<= TOLEL) {
           if((t2[1]-t2[0])<TOLEL ) {
             t1[1] = tmp2;  t1[0] = tmp1;
             return (1) ;
           }
       }
 /*      if(tl1<0.01 && ur1>0.99)  return (-3) ; */   
       t1[1] = tmp2;  t1[0] = tmp1;
       lr_split(ndeg,x1,y1,tl1,ur11); n_clip++; 
		 showStatus(" Number of split="+ nsplit+" Number of clip="+n_clip);
 	   if(disp_con==0) {
        g.setColor(Color.gray);
        for(int k=0;k<ndeg;k++)
        g.drawLine((int)x1[k], (int)y1[k], (int)x1[k+1], (int)y1[k+1]);} 
      }
      return 0;
  }
/* ********************************************************************: */
public void lsplit(int ndeg,double x[],double y[],double ur)
/* ********************************************************************: */
{
     int i,j;

      for(i=1; i<= ndeg; i++)
         for(j=ndeg; j>=i; j--) {
/*         x[j] = x[j] + (x[j-1] - x[j])*ur;
         y[j] = y[j] + (y[j-1] - y[j])*ur;*/
         x[j] += (x[j-1] - x[j])*ur; y[j] += (y[j-1] - y[j])*ur;
         }
}
/* ********************************************************************: */
public void lr_split(int ndeg,double x[],double y[],double tl,double ur)
/* ********************************************************************: */
{
     double tmp;

      rsplit(ndeg,x,y,tl);  if(ur == 0.) return;
      tmp = ur/(1.0-tl); lsplit(ndeg,x,y,tmp);
}
/* ********************************************************************: */
public void subdiv(int ndeg,double x[],double y[],double w[], 
			double xl[],double yl[],double wl[], double xr[],
			double yr[],double wr[],double t,double t0[],double tl[],double tr[])
/* ********************************************************************: */
{
     double[][] bx= new double[20][20];
     double[][] by= new double[20][20];
     double[][] bw= new double[20][20];
     int i,k, ii;

       for(i=0;i <= ndeg; i++) {
          bx[0][i] = x[i];  by[0][i] = y[i];
        }
       for(k=0; k <= ndeg; k++) {
         for(i=1; i <= ndeg; i++) {
             bx[k+1][i] = bx[k][i-1] + t*(bx[k][i] -bx[k][i-1]);
             by[k+1][i] = by[k][i-1] + t*(by[k][i] -by[k][i-1]);
          }
       }

      for(i=0;i <= ndeg; i++) {
         xl[i] = bx[i][i]; yl[i] = by[i][i]; 
         ii = ndeg-i;
         xr[i] = bx[ii][ndeg]; yr[i] = by[ii][ndeg]; 
      }
        tl[0] = t0[0]; tl[1] = t0[0]+(t0[1]-t0[0])*t;
        tr[0] = tl[1]; tr[1] = t0[1];
}
/* ********************************************************************: */
void rsplit(int ndeg,double x[],double y[],double tl)  
/* ********************************************************************: */
/* Subdivides the Bezier curve at tl, returning the right half.  */
{
     int i,j;

     for(i=1; i <= ndeg; i++)  {
         for(j=0; j <= ndeg-i; j++) {
/*         x[j] = x[j] + (x[j+1] - x[j])*tl;
         y[j] = y[j] + (y[j+1] - y[j])*tl;*/
         x[j] += (x[j+1] - x[j])*tl; y[j] += (y[j+1] - y[j])*tl;

         }
     }
}
/* ****** root1 is not uded here ********************************: */
public Vec2 root1(int nmdeg,double span, double cf[], double tl, double ur)
{
      double t, tmin, tmax;
      int i,j;
      /* printf("root:cf=%f %f %f %f \n",cf[0],cf[1],cf[2],cf[3]);*/
      if((cf[0] > 0.) && (cf[nmdeg] < 0.) ) /* (+ ? ? -) > right cut [0,tmax] */
      {     tmax = 0. ;  /* do 310 */
            for (i=0; i < nmdeg; i++) {
              if(cf[i] > 0.) {
                for(j= i+1 ; j <= nmdeg; j++) {
                  if(cf[j] < cf[i]) {
                    if(cf[j] < 0.) {
                    t = (cf[i]/(cf[i]-cf[j])*(double)(j-i)+i)*span;
                    if(t > tmax) tmax = t;
                   /*printf("root1:t,tmax=%f %f ij=%d %d cf=%f %f \n",t,tmax,
                   i,j,cf[i],cf[j]); */
                    }
                  }
                }
              }
             }
            if(tmax != 0.) {
              if(tl > tmax+.000001) return new Vec2(-1.,ur)  ;
              if(ur > tmax) ur = tmax;}
       } 
       else if( (cf[0] < 0.) && (cf[nmdeg] > 0.) ) 
/*                            (- ? ? +) > left cut  [tmin,1.] */
       {    tmin = 1. ;  /* do 320 */
            for(i=0; i < nmdeg; i++) {
             if(cf[i] < 0.) {
              for(j=i+1; j <= nmdeg ; j++) {
                 if(cf[j] > cf[i]) {
                     if(cf[j] > 0.) {
                     t = (cf[i]/(cf[i]-cf[j])*(double)(j-i)+i)*span ;
                     if(t < tmin) tmin = t ;
                     }
                 }
               }
             }
            }
            if(tmin != 1.) {
                  if(ur < tmin-0.000001) return new Vec2(-1.,1.0) ;
                  if(tl < tmin) tl = tmin;   }
        }
        else if( (cf[0]> 0) && (cf[nmdeg] > 0.) ) { }
       /*               split 1/2          */
        else if( (cf[0] < 0.) && (cf[nmdeg] < 0.)) 
/*                         (- ? ? -) > both side cut    [tmin,tmax] */
        {   tmax = 0. ;       /* do 330 */
            for(i=1; i < nmdeg; i++) {
                for(j=i+1; j <= nmdeg; j++) {
                    if( (cf[i] > 0.) && (cf[j] < 0.)) {
                    t = (cf[i]/(cf[i]-cf[j])*(double)(j-i)+i)*span ;
                    if(t > tmax) tmax = t ;
                    }
                }
             }
            if(tmax != 0) {
                   if(tl > tmax+.000001) return new Vec2(-1.,1.0)  ;
                   if(ur > tmax) ur = tmax ; }
           tmin = 1. ;       /* do 340 */
           for(i=0; i < nmdeg-1; i++)    {
              for(j=i+1; j < nmdeg; j++) {
                 if((cf[i] < 0) && (cf[j] > 0.)) {
                 t = (cf[i]/(cf[i]-cf[j])*(double)(j-i)+i)*span ;
                 if(t < tmin) tmin = t;     
               }
               }
            }
            if(tmin != 1.) {
               if(ur < tmin-0.000001) return new Vec2(-1.,1.0) ;
               if(tl < tmin) tl = tmin ;  }
       }
         return new Vec2(tl,ur) ;
}
}
/* ********************************************************************: */
class Vec2{ /* ベクトルクラス */
   public double u,v;

   Vec2(){
   }

   Vec2(double nwx,double nwy){
      u=nwx;
      v=nwy;
   }

   void setval(double nwx,double nwy){ /* ベクトルの値を代入 */
      u=nwx;
      v=nwy;
   }  
}
class Point2{ /* ベクトルクラス */
   public double x,y;

   Point2(){
   }

   Point2(double nwx,double nwy){
      x=nwx;
      y=nwy;
   }

   void setval(double nwx,double nwy){ /* ベクトルの値を代入 */
      x=nwx;
      y=nwy;
   }  
}
