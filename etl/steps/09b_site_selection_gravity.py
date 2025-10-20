from lib.mssql import fetch_df, to_sql
import pandas as pd, math, re

WX = "cyrgweixin"
DW = "hotdog2030"

def haversine(lat1,lng1,lat2,lng2):
    R=6371.0
    phi1,phi2=math.radians(lat1),math.radians(lat2)
    dphi=math.radians(lat2-lat1)
    dl=math.radians(lng2-lng1)
    a=math.sin(dphi/2)**2+math.cos(phi1)*math.cos(phi2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(a))

def parse_location(s):
    if not s: return None
    nums=re.findall(r"-?\d+\.\d+", s)
    if len(nums)>=2:
        a,b=map(float,nums[:2])
        lon,lat=(a,b) if abs(a)>abs(b) else (b,a)
        if 18<=abs(lat)<=54 and 72<=abs(lon)<=135:
            return lat,lon
    return None

def load_candidates():
    sql="SELECT Id AS candidate_id, ShopName AS name, ShopAddress AS address, location FROM Rg_SeekShop WHERE Delflag=0"
    df=fetch_df(sql,WX)
    df['lat'],df['lng']=zip(*[(parse_location(s) or (None,None)) for s in df['location'].fillna('')])
    return df

def load_stores_with_perf():
    sql="SELECT s.id AS store_id,s.city,s.longitude,s.latitude,AVG(d.revenue) AS avg_rev FROM dbo.stores s LEFT JOIN dbo.vw_sales_store_daily d ON d.store_id=s.id GROUP BY s.id,s.city,s.longitude,s.latitude"
    return fetch_df(sql,DW)

def main():
    cand=load_candidates();stores=load_stores_with_perf();rows=[]
    for _,c in cand.iterrows():
        if pd.notna(c.lat) and pd.notna(c.lng):
            cannibal=sum(stores.apply(lambda s:(s.avg_rev or 0)/(max(haversine(c.lat,c.lng,s.latitude,s.longitude),0.1)**2) if pd.notna(s.latitude) else 0,axis=1))
        else: cannibal=len(stores)
        match=stores['avg_rev'].mean() if 'avg_rev' in stores else 0
        rows.append({'candidate_id':int(c.candidate_id),'city':c.address[:2] if isinstance(c.address,str) else None,
                     'match_score':match,'cannibal_score':cannibal})
    df=pd.DataFrame(rows)
    if df.empty: return
    df['match_score']=df['match_score']/df['match_score'].max()
    df['cannibal_score']=df['cannibal_score']/df['cannibal_score'].max()
    df['total_score']=0.6*df['match_score']+0.4*(1-df['cannibal_score'])
    df['rationale']="重力模型选址：营收匹配+蚕食修正"
    to_sql(df[['candidate_id','city','match_score','cannibal_score','total_score','rationale']], 'dbo.fact_site_score', DW, if_exists='replace')

if __name__ == "__main__":
    main()