/* ********************************************************************: */
void cuvbuf(int ndeg,double x1[],double y1[],double w1[],double t1[],
			double xt1[],double yt1[],double wt1[],double tt1[])
/* ********************************************************************: */
//int ndeg;
//FloatType x1[],y1[],w1[],t1[2],xt1[],yt1[],wt1[],tt1[2];
{
    int  i;
    for(i=0; i <= ndeg; i++) {
           xt1[i] = x1[i]; yt1[i] = y1[i]; wt1[i] = w1[i];}
    tt1[0] = t1[0]; tt1[1] = t1[1];
}
/* ********************************************************************: */
int hull(int ndeg,double x[],double y[],double w[],int mdeg,
		 double xx[],double yy[],double ww[],double tl,
		 double ur,double aa,double bb,int mono)
/* ********************************************************************: */
//int ndeg,mdeg, *mono;
//FloatType x[],y[],w[],xx[],yy[],ww[],*tl,*ur,*aa,*bb;
{
     int  i, il, iposi,k, inega;
     double x0,y0,x3,y3,a,b,tmp,cmin,cmax,tmp1,span;
     double dmin, dmax;
     double[] cf = new double[20];
     double[] bf = new double[20];

     int nside = 2;

     x0 = xx[0]; y0 = yy[0];
     x3 = xx[mdeg]; y3 = yy[mdeg];

     a = y0-y3; b = x3-x0;   /*  coefficient of fat_line  */
     tmp = Math.sqrt(a*a+b*b);

     if(tmp < 0.000001) tmp = 1;
     a = a/tmp; b = b/tmp ;
     aa = -b; bb = a;
/*       calculation  [cmin,cmax], [dimin,dmax]   */
      cmin = -a*x0 - b*y0; cmax = cmin;

     /*for(i=1; i <= mdeg; i++) {*/
     for(i=1; i < mdeg; i++) {
          tmp1 = -(a*xx[i] + b*yy[i]);
          if(tmp1 < cmax) cmax = tmp1; if(tmp1 > cmin) cmin = tmp1;
     }
     span = 1./(double)ndeg;
     tl = 0.; ur = 1.;

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
          }/*}*/
         }
      else if(il == 3) {
                       if(ur-tl < 0.5) return (-1);
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
             /*printf(" il=%d cmain,max=%f %f  \n",il,cmin,cmax);*/
        }
      else {
           for (k=1; k <= ndeg; k++) {
             cf[k] =  -b*x[k] + a*y[k] - dmax;
             if(cf[k] > 0.) iposi = 1;
             else inega = 1;}
       }

       if(iposi == 0)  return (-1); /* all negative means : dont't overlap */
       if(inega != 0) {             /*      (+ + + +) */
        /*    if(cf[0]<-0.001 && cf[ndeg]<-0.001) { printf(" split;hull \n"); 
             return (1);} */
            if(root(ndeg,span,cf,tl,ur) < 0)  return (-1);
              /* printf(" il=%d after root=%f %f  \n",il, *tl, *ur);*/

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
             }
        }
     }              
     return (0);
}
/* ********************************************************************: */
int ovrlp(int ndeg,double x1[],double y1[],double w1[],double t1[],
		  int mdeg,double x2[],double y2[],double w2[],double t2[],double dd)
/* ********************************************************************: */
/*
  Checks the overlap of the two curve segments
  return = 0  for no overlap (=no intersections)
         = -1 for inadequate clip (split each curve and try again)
         = 1  for intersection found                                     */
//FloatType x1[],y1[],x2[],y2[],w1[],w2[],t1[2],t2[2], *dd;
//int ndeg; int mdeg;
{
      double tmp1, tmp2,aa,bb, tl2,ur1,ur2, ur22, tl1;
      double aa2,bb2, ur11;
      /*static FloatType tol=0.001;*/
      int icount, jover, mono1,mono2;   /*int nnn = 10;*/

      for(icount=0; icount< 20; icount ++) {
          iproces++; dd = 0.;
          mono1 = 0;  mono2 = 0;
          /*if(iproces > nnn) nside = 2;*/

/*   The fat line is defined by two bounding lines:
                aX + bY + cmin
               -aX - bY - cmax
                bX - aY + dmin
               -bX + bY - dmax
 where for any point (X,Y) between the two lines, both function values are 
 positive. Portions of the curve in the negative half space are trimmed away. */

/*  curve-2 is clip by curve-1 */
        jover = hull(mdeg,x2,y2,w2,ndeg,x1,y1,w1,tl2,ur2,aa,bb,mono1);
        if(jover < 0) return 0;
        if(jover == 1) return (-3);
        ur22 = 1. - ur2;
        tmp2 = t2[0] + tl2*(t2[1]-t2[0]);  tmp1 = t2[1] + ur22*(t2[0]-t2[1]);

      if((tmp1-tmp2)< TOLEL) { /* cut curve-2 by curve-1 */ 
          if((t1[1]-t1[0]) <= TOLEL) {t2[1] = tmp1;  t2[0] = tmp2;return 1;}
        }
       if(tl2> 0.02 || ur2 < 0.98) {
           t2[1] = tmp1; t2[0] = tmp2;

           lr_split(mdeg,x2,y2,tl2,ur22); //n_clip++ ;

        }
/*  curve-1 is clip by curve-2 */
       jover = hull(ndeg,x1,y1,w1,mdeg,x2,y2,w2,tl1,ur1,aa2,bb2,mono2);
       if(jover < 0) return 0;
       if(jover == 1) return (-2);
       if((ur2 - tl2 > 0.80) && (ur1 - tl1 > 0.80)) return (-1) ;

       if( ur1 - tl1 > 0.98 ) return (-2) ;

        ur11 = 1-ur1;
        tmp1 = t1[0] + tl1*(t1[1]-t1[0]); tmp2 = t1[1] + ur11*(t1[0]-t1[1]);
       if( (ur2 - tl2 > 0.98) && icount>0 ) {
           t1[1] = tmp2;  t1[0] = tmp1;
           lr_split(ndeg,x1,y1,tl1,ur11); n_clip++ ;

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
      }
      return 0;
}
